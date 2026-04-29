# Embeddings — Hybrid Retrieval Pipeline

This document covers everything about the embedding system: what it is,
why it exists, and how every piece works.

Two source files implement this:

- [`db/embeddings-setup.sql`](../db/embeddings-setup.sql) — all the SQL
  (extensions, queue, triggers, RPCs, backfill helper). Idempotent — paste
  into the Supabase SQL editor whenever you change it.
- [`supabase/functions/process-embeddings/index.ts`](../supabase/functions/process-embeddings/index.ts)
  — the Deno edge worker that reads queue rows and calls the AI Gateway.

---

## Why embeddings at all

Without embeddings, the chatbot can answer numeric questions (how much,
when, what category) but cannot answer **content** questions:

- "Find that subscription I cancelled"
- "What did I buy at work last week"
- "Did I have any restaurant expenses"

These descriptions don't map cleanly to category or date filters. They map
to *text similarity* against the descriptions the user typed when adding
transactions. Vector embeddings + cosine similarity is the standard way to
do that.

The two retrieval paths form the **hybrid retrieval system** (see
[architecture.md](architecture.md)):

| User question shape | Tool family | What it touches |
|---|---|---|
| Numeric / date range | `query*` | SQL on `Expense`/`Income` columns |
| Content / context keyword | `search*Semantic` | HNSW index on `embedding` column |
| Mixed | search first, sum from results | both |

---

## The pipeline at a glance

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  INSERT INTO Expense (description, ...)                     │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────────────────────┐                       │
│  │ trg_enqueue_expense_embedding    │  AFTER INSERT/UPDATE  │
│  │ (or _income_)                    │                       │
│  └──────────────┬───────────────────┘                       │
│                 │                                           │
│                 ▼                                           │
│  ┌──────────────────────────────────┐                       │
│  │ INSERT INTO embedding_queue      │                       │
│  │ (source_table, source_id, text)  │                       │
│  └──────────────┬───────────────────┘                       │
│                 │                                           │
│                 ▼                                           │
│  ┌──────────────────────────────────┐                       │
│  │ notify_embedding_worker(queue_id)│                       │
│  │  - reads vault secrets           │                       │
│  │  - pg_net.http_post (async)      │                       │
│  └──────────────┬───────────────────┘                       │
│                 │                                           │
│   trigger returns; INSERT commits.  user is unblocked.      │
│                 │                                           │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │  HTTP POST (background)
                  ▼
       ┌──────────────────────────────────┐
       │ process-embeddings edge function │
       │  1. mark queue row processing    │
       │  2. validate source_table        │
       │  3. POST to AI Gateway           │
       │  4. UPDATE source row.embedding  │
       │  5. mark queue row done          │
       │  fail → retry up to 3x then      │
       │         mark failed              │
       └──────────────────────────────────┘
```

**Key property:** the trigger never blocks. `pg_net.http_post` returns
instantly; the actual HTTP call happens in a background worker. The user's
INSERT commits whether or not the embedding succeeds.

---

## SQL infrastructure walkthrough

The file [db/embeddings-setup.sql](../db/embeddings-setup.sql) is divided
into 8 sections.

### 1. Extensions

```sql
create extension if not exists vector;
create extension if not exists pg_net;
```

- **vector** (pgvector) — adds the `vector(N)` type and operators for
  vector ops. We use cosine distance (`<=>`) for similarity.
- **pg_net** — adds `net.http_post` so SQL can fire HTTP requests
  asynchronously. Critical: this is fire-and-forget; the call returns
  before the request even goes out.

### 2. Generic embedding queue

```sql
create table public.embedding_queue (
  id            bigserial primary key,
  source_table  text        not null,
  source_id     bigint      not null,
  source_text   text        not null,
  status        text        not null default 'pending',  -- pending|processing|done|failed
  attempts      int         not null default 0,
  last_error    text,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz
);
```

A single queue table shared by *all* embeddable tables. Adding a new
embeddable table (Goals, Plaid, etc.) does not require a new queue —
just a new `source_table` value plus the trigger and whitelist entry
(see "Adding a new embeddable table" below).

Indexes:

- `(status, created_at)` — for finding pending rows in order.
- `(source_table, source_id)` — for looking up a row by its source.

### 3. Embedding columns + HNSW indexes

```sql
alter table public."Expense"
  add column if not exists embedding             vector(1536),
  add column if not exists embedding_updated_at  timestamptz;

create index if not exists expense_embedding_hnsw_idx
  on public."Expense" using hnsw (embedding vector_cosine_ops);
```

- **1536 dimensions** matches OpenAI `text-embedding-3-small`. If you
  switch models, the dimension may change — you'd need to migrate the
  column type and re-embed everything.
- **HNSW** (Hierarchical Navigable Small World) — fast approximate
  nearest-neighbor index. Supports `vector_cosine_ops` for cosine
  similarity. Trade-off: build time is slow but query time is fast and
  scales well.
- **`embedding_updated_at`** — bookkeeping. Lets you spot stale
  embeddings (e.g. description was edited but embedding wasn't refreshed
  for some reason).

The same shape exists for `Income`. The file has a `>>> ADD NEW TABLE
HERE <<<` marker for future tables.

### 4. Worker notification helper

```sql
create or replace function public.notify_embedding_worker(queue_id bigint)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'embeddings_edge_url';
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if v_url is null or v_key is null then
    raise warning '[embeddings] vault secrets missing; queue_id=% will remain pending', queue_id;
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('queue_id', queue_id),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
end;
$$;
```

What it does:

1. Read the edge function URL and worker secret from Supabase Vault.
2. If either is missing, log a warning and *return* (don't fail the
   trigger). The queue row stays pending and can be backfilled later.
3. Otherwise fire `net.http_post` with the queue_id in the body.

`security definer` lets it read the vault. `set search_path = public,
vault` makes the vault schema accessible inside the function.

The vault secret name is `service_role_key` for historical reasons —
we initially used the actual service role key. After hitting auth
mismatches (see [troubleshooting.md](troubleshooting.md)), we switched
to a dedicated worker-shared secret but kept the vault key name.

### 5. Trigger functions + triggers

For each embeddable table, two pieces:

**Trigger function** — converts row inserts/updates into queue rows.

```sql
create or replace function public.enqueue_expense_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue_id bigint;
begin
  -- Skip no-op updates (description didn't change)
  if TG_OP = 'UPDATE' and NEW.description is not distinct from OLD.description then
    return NEW;
  end if;

  -- Skip empty descriptions
  if NEW.description is null or length(trim(NEW.description)) = 0 then
    return NEW;
  end if;

  insert into public.embedding_queue (source_table, source_id, source_text)
  values ('Expense', NEW.id, NEW.description)
  returning id into v_queue_id;

  perform public.notify_embedding_worker(v_queue_id);
  return NEW;
end;
$$;
```

Two early-exits:
- **No-op update guard:** prevents re-embedding when something other
  than the description changed.
- **Empty text guard:** can't embed nothing.

**Trigger** — wires the function to the table. Fires only on changes
to the description column:

```sql
create trigger trg_enqueue_expense_embedding
  after insert or update of description on public."Expense"
  for each row execute function public.enqueue_expense_embedding();
```

The same shape exists for `Income` (but on `source_description`).

### 6. Match RPCs

```sql
create or replace function public.match_expenses(
  query_embedding vector(1536),
  p_profile_id    uuid,
  match_threshold float default 0.3,
  match_count     int   default 10
)
returns table (
  id                 bigint,
  account_id         bigint,
  amount             float8,
  description        varchar,
  expense_categoryid bigint,
  transaction_date   timestamptz,
  similarity         float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.account_id,
    e.amount,
    e.description,
    e.expense_categoryid,
    e.transaction_date,
    (1 - (e.embedding <=> query_embedding))::float as similarity
  from public."Expense" e
  where e.profile_id = p_profile_id
    and e.embedding is not null
    and (1 - (e.embedding <=> query_embedding)) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
```

A few things to note:

- **`e.embedding <=> query_embedding`** is the cosine *distance* operator
  (lower = more similar). The expression `1 - (e.embedding <=>
  query_embedding)` flips this to cosine *similarity* (higher = more
  similar, range `[-1, 1]`).
- **`order by e.embedding <=> query_embedding`** — ordering by distance
  ascending uses the HNSW index.
- **`where e.embedding is not null`** — rows without embeddings are
  invisible to search. (Backfill them or they stay invisible.)
- **`p_profile_id`** — every search is scoped to the user.
- **`security definer`** — the function runs with the function owner's
  privileges, so the chat route's secret-key client can invoke it.

`match_incomes` is the same shape against `Income` returning
`source_description` and `created_at`.

### 7. Backfill helper

```sql
select * from public.backfill_embeddings();
```

What it does:

1. Enqueues every `Expense` row missing an embedding.
2. Enqueues every `Income` row missing an embedding.
3. Loops over freshly-pending rows and fires
   `notify_embedding_worker()` for each.

Returns a tally of how many rows it queued per table. Run this after the
edge function is deployed and the vault secrets are set, OR after a model
change that requires re-embedding.

The function is idempotent for already-embedded rows (the `where embedding
is null` guard). Re-running it after a partial failure just enqueues the
stragglers.

### 8. Permissions

```sql
alter table public.embedding_queue enable row level security;
revoke all on public.embedding_queue from anon, authenticated;
revoke all on function public.notify_embedding_worker(bigint) from anon, authenticated;
-- ... revokes on all other internal functions
revoke all on function public.match_expenses(vector(1536), uuid, float, int) from anon, authenticated;
revoke all on function public.match_incomes(vector(1536), uuid, float, int) from anon, authenticated;
```

Defense in depth:

- RLS enabled with no policies = anon and authenticated cannot touch
  `embedding_queue` directly.
- Match RPCs are revoked from anon/authenticated. They're called via the
  chat route which uses the secret key (which bypasses these revokes).
- This means even if the anon key leaks, nobody can run `match_expenses`
  to enumerate transactions.

---

## The edge function

[`supabase/functions/process-embeddings/index.ts`](../supabase/functions/process-embeddings/index.ts).

Triggered by the `notify_embedding_worker` HTTP POST. Runtime is Deno (the
`npm:` import prefix is the Deno way to use npm packages).

### Authentication

```typescript
const auth = req.headers.get("Authorization") ?? "";
if (auth !== `Bearer ${WORKER_SHARED_SECRET}`) {
  return json({ error: "Unauthorized" }, 401);
}
```

`WORKER_SHARED_SECRET` is a dedicated env var set in Edge Function
Secrets, **not** the auto-injected `SUPABASE_SERVICE_ROLE_KEY`. The
vault stores the same value under the (legacy-named) `service_role_key`
key. See [troubleshooting.md](troubleshooting.md) for why this exists —
it was a fix for a key-system rollout mismatch between auto-injected env
vars and the vault.

### Source-table whitelist

```typescript
const TABLE_WHITELIST: Record<string, {
  tableName: string;
  idCol: string;
  embeddingCol: string;
  updatedCol: string;
}> = {
  Expense: { tableName: "Expense", idCol: "id", embeddingCol: "embedding", updatedCol: "embedding_updated_at" },
  Income:  { tableName: "Income",  idCol: "id", embeddingCol: "embedding", updatedCol: "embedding_updated_at" },
};
```

`source_table` from the queue row is keyed against this map. If it's not
present, the queue row is marked `failed` immediately.

This is **SQL injection prevention**. The function dynamically constructs
update queries based on the queue row's `source_table` field. Without the
whitelist, a malicious queue row (somehow) could set `source_table` to
arbitrary SQL fragments. With the whitelist, only entries we've vetted
ahead of time can run.

### Step-by-step

1. **Read queue row** by `queue_id` from request body.
   - If status is `done`: skip with `{ ok: true, skipped: "already done" }`
     (idempotency if pg_net retried).
2. **Mark `processing`** and increment `attempts`.
3. **Whitelist check**.
4. **Embed**: POST to `https://ai-gateway.vercel.sh/v1/embeddings` with
   `{ model, input: source_text }` and the AI gateway API key. Returns
   the vector or throws.
5. **Update source row**: `UPDATE <whitelist.tableName> SET embedding = <vec>,
   embedding_updated_at = now()` filtered by source id.
6. **Mark `done`** with `processed_at = now()`.

On error:

- If `attempts >= 3`: mark `failed` with `last_error`.
- Otherwise: leave as `pending` so a future trigger / backfill can retry.

### Required env vars

| Var | Source | Why |
|---|---|---|
| `SUPABASE_URL` | auto-injected by Supabase | Build the Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-injected | Used to construct the client |
| `WORKER_SHARED_SECRET` | manual (Edge Function Secrets) | Auth check on incoming requests |
| `AI_GATEWAY_API_KEY` | manual | Auth header for the AI Gateway |
| `EMBEDDING_MODEL` | manual | e.g. `openai/text-embedding-3-small` |

See [configuration.md](configuration.md) for the full secret matrix.

---

## Queue row lifecycle

| Status | Meaning | What sets it |
|---|---|---|
| `pending` | Awaiting processing | Initial INSERT (trigger or backfill) |
| `processing` | Edge function picked it up | Edge function at start |
| `done` | Embedding written successfully | Edge function on success |
| `failed` | Hit max attempts | Edge function after attempts ≥ 3 |

Status transitions:

```
pending ──► processing ──► done
                       └─► pending  (retry, attempts < 3)
                       └─► failed   (give up, attempts ≥ 3)
```

A row stuck at `pending` with `attempts = 0` likely means
`notify_embedding_worker` failed silently (vault secrets missing). Run
`backfill_embeddings()` to retry.

A row at `failed` is permanent unless you reset it manually:

```sql
update public.embedding_queue
   set status = 'pending', attempts = 0, last_error = null
 where status = 'failed';
```

Then call `notify_embedding_worker` for each, or run
`backfill_embeddings()` (which only enqueues missing-embedding rows, not
existing failed queue rows — clear failed rows first if you want them
re-enqueued).

---

## Adding a new embeddable table

Three changes, all idempotent:

### 1. SQL: add column, index, trigger

In `db/embeddings-setup.sql`:

```sql
-- Section 3: column + index
alter table public."Goals"
  add column if not exists embedding             vector(1536),
  add column if not exists embedding_updated_at  timestamptz;

create index if not exists goals_embedding_hnsw_idx
  on public."Goals" using hnsw (embedding vector_cosine_ops);

-- Section 5: trigger function + trigger
create or replace function public.enqueue_goals_embedding()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_queue_id bigint;
begin
  if TG_OP = 'UPDATE' and NEW.description is not distinct from OLD.description then return NEW; end if;
  if NEW.description is null or length(trim(NEW.description)) = 0 then return NEW; end if;
  insert into public.embedding_queue (source_table, source_id, source_text)
  values ('Goals', NEW.id, NEW.description)
  returning id into v_queue_id;
  perform public.notify_embedding_worker(v_queue_id);
  return NEW;
end; $$;

drop trigger if exists trg_enqueue_goals_embedding on public."Goals";
create trigger trg_enqueue_goals_embedding
  after insert or update of description on public."Goals"
  for each row execute function public.enqueue_goals_embedding();

-- Section 6: match RPC
create or replace function public.match_goals(...)  -- see template in the SQL file
```

The SQL file has `>>> ADD NEW TABLE HERE <<<` markers and templates for
each section. Copy them, replace `<Goals>` and `<description>`, run.

### 2. Edge function: whitelist entry

In [process-embeddings/index.ts](../supabase/functions/process-embeddings/index.ts):

```typescript
const TABLE_WHITELIST = {
  Expense: { ... },
  Income:  { ... },
  Goals:   { tableName: "Goals", idCol: "id", embeddingCol: "embedding", updatedCol: "embedding_updated_at" },
};
```

Redeploy:

```bash
supabase functions deploy process-embeddings
```

### 3. Search tool

In `utils/ai-tools/search-tools.ts`, add `searchGoalsSemantic` mirroring
`searchExpensesSemantic` but calling the new `match_goals` RPC.

Wire it into `+api.ts` (it'll spread automatically since it's already
spread from `searchTools(...)`).

### Composite text fields

If the table doesn't have a single text column (e.g. Plaid has
`merchant_name`, `name`, `original_description`), build the source_text
in the trigger:

```sql
v_text := coalesce(NEW.merchant_name, '') || ' ' ||
         coalesce(NEW.name, '') || ' ' ||
         coalesce(NEW.original_description, '');
```

Then insert `v_text` into the queue.

---

## Performance characteristics

| Operation | Time |
|---|---|
| `backfill_embeddings()` enqueue (any size) | ~1 second |
| Single embedding generation | 200–500 ms (gateway round trip) |
| 100 transactions backfill | 20–50 seconds (sequential) |
| 1,000 transactions backfill | 3–8 minutes |
| 10,000 transactions backfill | 30–80 minutes (or 5–10 if many concurrent edge invocations) |
| `match_expenses` query (10k rows) | < 50 ms (HNSW indexed) |

Rate-limit gotcha: **Vercel AI Gateway free credits have rate limits**.
Backfilling thousands of rows on free tier triggers 429s. The queue
marks them `failed` after 3 retries. Solution: paid credits, or backfill
in batches with sleeps.

---

## Tuning the threshold

The `match_threshold` parameter (default 0.3) controls how strict the
similarity match is. Lower = more permissive (more results, possibly
irrelevant). Higher = stricter (fewer results, but more confident).

Calibrate empirically:

```sql
-- Pick a row, see what similarities it gets against the others
with q as (select embedding from public."Expense" where id = <some_id>)
select e.description,
       (1 - (e.embedding <=> (select embedding from q))) as similarity
from public."Expense" e
where e.embedding is not null
order by similarity desc
limit 20;
```

Look at the gap between obvious matches (similarity > 0.6 typically) and
random noise (similarity < 0.2). Pick a threshold in the gap.

`text-embedding-3-small` produces fairly tight clusters — 0.3 is a
reasonable starting threshold but you can tune up to 0.4–0.5 for stricter
matches once you have real data.
