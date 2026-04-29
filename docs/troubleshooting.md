# Troubleshooting

Catalog of issues we've already hit, with diagnostic queries and fixes.
Each section has a symptom, a diagnosis path, and the fix that worked.

If you hit a new issue, document it here.

---

## Quick health check

Run these three queries to get a fast picture of system state:

```sql
-- 1. Are queue rows accumulating?
select status, count(*) from public.embedding_queue group by status;

-- 2. Are Expense rows actually getting embeddings?
select
  count(*) as total,
  count(embedding) as has_embedding,
  count(*) - count(embedding) as missing
from public."Expense";

-- 3. Recent queue activity
select id, source_table, status, attempts, last_error, created_at, processed_at
from public.embedding_queue
order by created_at desc
limit 10;
```

Healthy state: most queue rows are `done`, missing-embedding count is
small or zero, recent rows have `processed_at` set within seconds of
`created_at`.

---

## Issue: queue rows stuck at `pending`

**Symptom:** Inserting an `Expense` adds a row to `embedding_queue` with
status `pending`, but it never moves to `processing` or `done`.

**Diagnosis:**

1. Check `attempts`. If it's 0, the edge function was never called.
2. Check Supabase Edge Function logs (Dashboard → Edge Functions →
   process-embeddings → Logs). If there's no log entry for that
   `queue_id`, the HTTP call from `notify_embedding_worker` didn't reach
   the function.
3. Check pg_net response history:
   ```sql
   select * from net._http_response order by created desc limit 10;
   ```
   Look for non-200 responses or null responses.

**Possible causes:**

- **Vault secrets missing.** `notify_embedding_worker` returns silently
  if `embeddings_edge_url` or `service_role_key` aren't set in vault.
  Check:
  ```sql
  select name from vault.decrypted_secrets
   where name in ('embeddings_edge_url', 'service_role_key');
  ```
  Both should appear. If not, set them
  (see [configuration.md](configuration.md)).
- **Edge function 401.** `WORKER_SHARED_SECRET` doesn't match vault
  `service_role_key`. Both must be the same string. Look in
  `net._http_response` for status 401.
- **Edge function 500.** Function deployed but missing required env
  vars (`AI_GATEWAY_API_KEY`, `EMBEDDING_MODEL`). Check function logs
  for `Server misconfigured`.
- **Triggers disabled.** We disable them temporarily during dev (see
  "Temporarily disable embeddings"). Check:
  ```sql
  select tgname, tgenabled from pg_trigger
   where tgname in ('trg_enqueue_expense_embedding', 'trg_enqueue_income_embedding');
  ```
  `tgenabled` = `O` means enabled, `D` means disabled.

**Fix:**

After diagnosing, run a manual notification to test:

```sql
select public.notify_embedding_worker(<queue_id>);
```

If it processes after the fix, run `backfill_embeddings()` to clear any
backlog.

---

## Issue: edge function returns 401

**Symptom:** `net._http_response` shows status 401 for the embedding
function calls, even though `WORKER_SHARED_SECRET` and vault
`service_role_key` look right.

**Why this happens:** Supabase auto-injects `SUPABASE_SERVICE_ROLE_KEY`
into the edge function environment. During the new key system rollout,
the auto-injected key sometimes doesn't match the vault value.

**Fix:** the edge function uses a dedicated `WORKER_SHARED_SECRET` env
var (set manually) instead of relying on the auto-injected key. The vault
stores the same value. Both must match exactly.

If you set them and it still 401s:

1. Generate a fresh random string.
2. Paste into both Vault `service_role_key` *and* Edge Function
   `WORKER_SHARED_SECRET`.
3. Redeploy:
   ```bash
   supabase functions deploy process-embeddings
   ```

---

## Issue: semantic search returns nothing for terms that should match

**Symptom:** User asks "find that Uber I took" or "expenses at work",
the AI calls `searchExpensesSemantic`, but the result is `{ matches: [],
message: "No matching expenses found." }`. Yet you can confirm the
matching transactions exist and have embeddings.

**Diagnosis decision tree:**

### 1. Are the rows actually embedded?

```sql
select id, description, embedding is not null as embedded
from public."Expense"
order by id desc
limit 10;
```

If `embedded` is false for the relevant rows, semantic search can't see
them — `match_expenses` filters out null embeddings. Run
`backfill_embeddings()` and wait.

### 2. Are the stored embeddings actually meaningful?

Compare two rows that should have similar descriptions:

```sql
select
  a.description as desc_a,
  b.description as desc_b,
  (1 - (a.embedding <=> b.embedding)) as similarity
from public."Expense" a, public."Expense" b
where a.id = <id1> and b.id = <id2>
  and a.embedding is not null and b.embedding is not null;
```

Two rows with similar descriptions should have similarity 0.6+. If they
don't, the stored embeddings are bad — likely a bug in the edge function
or wrong model. Re-run backfill after verifying.

### 3. Is the query embedding in the same vector space?

This is the **model mismatch** trap. The edge function uses
`EMBEDDING_MODEL` from Edge Function Secrets to generate stored
embeddings. The chat route uses `process.env.EMBEDDING_MODEL` from
`.env.local` to embed queries.

If they're different model strings, the vector spaces differ and
similarity is essentially random.

Symptom: stored embeddings look fine (similarity between rows is high),
but query similarity is always near zero — even for queries that should
clearly match.

**Fix:** Make the two `EMBEDDING_MODEL` env vars exactly equal.
`openai/text-embedding-3-small` is the canonical value.

### 4. Is the threshold too high?

Default threshold is 0.3. For some queries that's too strict. Try
calling with a lower threshold:

```typescript
searchExpensesSemantic({ query: "...", threshold: 0.1 })
```

If lowering the threshold returns matches with similarity 0.15–0.25,
they're real but below the cutoff. Tune the default down, or accept
that some queries won't match.

---

## Issue: `Model 'openai/text-embedding-3' not found`

**Symptom:** Server logs show:

```
GatewayModelNotFoundError: Model 'openai/text-embedding-3' not found
```

**Cause:** `.env.local` has `EMBEDDING_MODEL=openai/text-embedding-3` —
the suffix `-small` (or `-large`) is missing.

**Fix:** Set:

```
EMBEDDING_MODEL=openai/text-embedding-3-small
```

Then restart the dev server. `text-embedding-3-small` produces 1536-dim
vectors which match the column type. Don't switch to `-large` (3072 dims)
without altering the table column.

---

## Issue: Vercel AI Gateway 429 (rate limit)

**Symptom:** Backfill runs partially then queue rows start failing with:

```
embed: Gateway 429: {"error":{"message":"Free credits temporarily have rate limits..."}}
```

**Cause:** Vercel AI Gateway free credits have rate limits during abuse
spikes. Backfilling thousands of rows hits this fast.

**Fixes:**

- **Add paid credits** at vercel.com/~/ai. Removes the rate limit.
- **Wait it out**. The limit lifts after some hours.
- **Disable embeddings during dev**:
  ```sql
  alter table public."Expense" disable trigger trg_enqueue_expense_embedding;
  alter table public."Income"  disable trigger trg_enqueue_income_embedding;
  ```
  Re-enable later with `enable trigger`. New transactions won't queue
  embeddings while disabled.

**Cleanup after a 429 storm:**

```sql
-- Inspect the damage
select status, count(*) from public.embedding_queue group by status;

-- Clear failed rows
delete from public.embedding_queue
 where status = 'failed' or status = 'processing';

-- Or reset them to pending so they retry on next backfill
update public.embedding_queue
   set status = 'pending', attempts = 0, last_error = null
 where status = 'failed';
```

**Important:** Do NOT delete `Expense` or `Income` rows. The data is
fine; only the embedding queue is in a bad state.

---

## Issue: AI refuses semantic search ("can't search by location")

**Symptom:** User asks "have I been buying things at work?" The AI
responds:

> I cannot fulfill this request. The available tools lack the ability to
> search for transactions based on location.

**Cause:** The model interprets "at work" as a GPS / location query and
refuses, instead of recognizing it's a description-text filter.

**Fix:** the system prompt's RETRIEVAL RULES section has explicit
examples for this case:

> "at work" → query: "at work"
> "during lunch" → query: "lunch"
> ...
> RULE: If the user's message contains any descriptive word or phrase
> about the nature of the transaction, extract it and pass it to
> searchExpensesSemantic as the query. You have the ability to do this.
> Do it.

If the AI is still refusing despite this prompt, possible causes:

- **Stale prompt.** Restart the dev server so the new prompt loads.
- **Model is too small to follow nuanced instructions.** Switch from
  `gemini-2.5-flash-lite` to a stronger model temporarily to verify
  this. If a stronger model works, decide whether to upgrade
  permanently or iterate further on the prompt.
- **The query phrase is ambiguous.** "Where did I buy stuff" is
  actually a GPS-y question — semantic search on description text
  can't answer it well unless users typed location into descriptions.
  Manage user expectations.

---

## Issue: AI invents fake numbers / hallucinates totals

**Symptom:** AI says "you spent $1,247 on groceries last month" but the
real number from a manual SQL query is different.

**Cause:** The AI computed totals itself instead of calling a `query*`
tool, or it summed semantic search results without using a query tool.

**Fix:** the system prompt's RETRIEVAL RULES contains:

> NEVER invent numbers. If a query* tool returns nothing, say so
> honestly — do not estimate.

If hallucinations persist:

- Add explicit "DO NOT compute totals from your own knowledge" wording.
- Switch to a stronger model.
- Add unit tests that simulate the exchange and assert the right tool
  was called.

---

## Issue: Insert flow stops working / picker doesn't appear

**Symptom:** User says "I spent $50 at Starbucks", AI replies with text
asking "which account?" instead of rendering the picker.

**Cause:** The AI didn't call `getAccountsAndCategoriesForSelection`. It's
asking in text, which is wrong — the picker is a tool call.

**Fix:** the system prompt's Step 1 says:

> As soon as the user mentions an expense (with amount + description),
> IMMEDIATELY call getAccountsAndCategoriesForSelection.

If the model is being lazy, you can:

- Add an even firmer rule: "NEVER ask 'which account' in text. Always
  call the tool."
- Switch to a stronger model.

---

## Issue: AI reveals IDs to the user

**Symptom:** Confirmation message says "Account ID: 42" or similar.

**Fix:** rule 4 in CRITICAL RULES of the system prompt:

> NEVER REVEAL IDs to users under any circumstances

If the AI does it anyway, reinforce in the confirmation format:

> Display the confirmation exactly in this format (fill in values from
> result.details — names only, never IDs)

---

## Issue: balance went the wrong way after insert

**Symptom:** Adding an expense to a credit card *decreased* the balance
instead of increasing it.

**Cause:** Inverted logic in `insertExpense` / `insertIncome`. The intent:

- **Expense on debit/checking/savings** → balance ↓
- **Expense on credit** → balance ↑ (increases debt owed)
- **Income on debit/checking/savings** → balance ↑
- **Income on credit** → balance ↓ (reduces debt owed)

Check `insertExpense` in
[utils/ai-tools/expense-tools.ts](../utils/ai-tools/expense-tools.ts):

```typescript
const isCredit = account.account_type === "credit";
const newBalance = isCredit ? account.balance + amount : account.balance - amount;
```

If `account_type` is something unexpected (`"credit_card"`, `"line of credit"`,
etc.), the comparison fails and it falls through to the debit branch. Make
sure account types are normalized to the strings the code checks.

---

## Issue: `match_expenses` is slow on lots of rows

**Symptom:** Semantic search takes 2+ seconds at 50k+ rows.

**Cause:** HNSW index isn't being used. Check:

```sql
explain analyze
select id from public."Expense"
where embedding is not null
order by embedding <=> '[0,0,...]'::vector
limit 10;
```

If you don't see `Index Scan using expense_embedding_hnsw_idx`, the
planner chose a sequential scan. Common reasons:

- The index hasn't been built yet (just created — wait for it to build).
- Stats are stale: `analyze public."Expense";`.
- `match_threshold` filter is forcing a full scan; HNSW only helps with
  the ORDER BY. Try adjusting threshold logic or increase HNSW build
  parameters (`m`, `ef_construction`).

---

## Diagnostic snippets

### What rows are missing embeddings, and why?

```sql
with stats as (
  select
    e.id, e.description,
    e.embedding is not null as embedded,
    q.status as queue_status,
    q.attempts, q.last_error
  from public."Expense" e
  left join lateral (
    select status, attempts, last_error
    from public.embedding_queue
    where source_table = 'Expense' and source_id = e.id
    order by created_at desc
    limit 1
  ) q on true
)
select * from stats
where not embedded
order by id desc
limit 20;
```

### Are triggers enabled?

```sql
select event_object_table, trigger_name, action_timing, event_manipulation,
       (select tgenabled from pg_trigger where tgname = trigger_name) as enabled
from information_schema.triggers
where trigger_name like 'trg_enqueue_%';
```

### What's the recent pg_net call activity?

```sql
select status_code, content::text, created
from net._http_response
order by created desc
limit 20;
```

### Force a single queue row through the worker

```sql
select public.notify_embedding_worker(<queue_id>);
```

Then check the function logs in Supabase Dashboard.

---

## When to ask for help

If you've gone through this doc and the issue persists, capture for the
next debugger:

1. The exact symptom (error message, what tool was called, what was
   returned).
2. Output of the three "quick health check" queries.
3. Output of `select status_code, content::text from net._http_response
   order by created desc limit 5;`.
4. Any recent changes to env vars, vault secrets, or the `embeddings-setup.sql`
   schema.

That bundle is enough context to debug without re-deriving state.
