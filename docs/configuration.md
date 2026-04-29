# Configuration — Env Vars, Vault, & Secrets

The chatbot has secrets in **three different stores**. Each one is read by
a different process. Getting them out of sync is the #1 cause of
"everything is deployed but nothing works" — see
[troubleshooting.md](troubleshooting.md).

---

## The three secret stores

| Store | Where | Read by |
|---|---|---|
| `.env.local` (or production env) | Local dev / Vercel / your hosting platform | The Expo server-side API route (Node.js process running `+api.ts`) |
| **Edge Function Secrets** | Supabase Dashboard → Edge Functions → Manage Secrets | The Deno process running `process-embeddings` |
| **Supabase Vault** | Supabase Dashboard → Project Settings → Vault | SQL functions inside Postgres (`notify_embedding_worker`) |

These are *separate* systems. A value set in one is not automatically
available in the others.

---

## What each secret is for

### `.env.local` (server-side env)

Read by [`app/api/chat/+api.ts`](../app/api/chat/+api.ts) and
[`utils/ai-tools/search-tools.ts`](../utils/ai-tools/search-tools.ts) when
the chat API route runs.

| Variable | Used by | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `+api.ts` (createClient) | Supabase project URL |
| `SUPABASE_SECRET_KEY` | `+api.ts` (createClient) | Server-side key with full DB access (bypasses RLS) |
| `EMBEDDING_MODEL` | `search-tools.ts` (embedQuery) | Model used to embed user search queries |
| `EXPO_PUBLIC_API_BASE_URL` | `apiUrlGenerator.ts` (prod) | Public URL where the API is hosted (mobile build needs this) |

`EXPO_PUBLIC_*` vars are bundled into the mobile binary at build time.
Non-prefixed vars are server-only.

### Edge Function Secrets

Read by [`supabase/functions/process-embeddings/index.ts`](../supabase/functions/process-embeddings/index.ts)
when an HTTP request hits the function.

| Variable | Auto/Manual | Purpose |
|---|---|---|
| `SUPABASE_URL` | auto | Build the Supabase client inside the function |
| `SUPABASE_SERVICE_ROLE_KEY` | auto | Used by the Supabase client |
| `WORKER_SHARED_SECRET` | **manual** | The function rejects any request whose `Authorization: Bearer ...` doesn't match this value |
| `AI_GATEWAY_API_KEY` | **manual** | Auth for the Vercel AI Gateway embeddings endpoint |
| `EMBEDDING_MODEL` | **manual** | e.g. `openai/text-embedding-3-small` — the model that generates stored embeddings |

**`SUPABASE_*` are auto-injected** when you deploy the function — you don't
set them yourself.

**The other three are manual** — set them in Supabase Dashboard → Edge
Functions → process-embeddings → Manage Secrets.

### Supabase Vault

Read by [`db/embeddings-setup.sql`](../db/embeddings-setup.sql)'s
`notify_embedding_worker` function inside Postgres.

| Vault key | Purpose |
|---|---|
| `embeddings_edge_url` | URL of the deployed edge function (`https://<project-ref>.functions.supabase.co/process-embeddings`) |
| `service_role_key` | The bearer token that `notify_embedding_worker` puts in the `Authorization` header. **This must equal `WORKER_SHARED_SECRET`** in Edge Function Secrets |

The vault key is named `service_role_key` for historical reasons — early
versions of the system used the actual service role key. We changed to a
dedicated worker secret but kept the vault key name to avoid migration
churn.

Set vault secrets at Supabase Dashboard → Project Settings → Vault.

---

## The two model strings that must match

There are *two* places that reference the embedding model name:

1. **Edge Function `EMBEDDING_MODEL`** (e.g. `openai/text-embedding-3-small`)
   — used by the worker to generate stored embeddings.
2. **`.env.local` `EMBEDDING_MODEL`** — used by `search-tools.ts` to embed
   user queries at search time.

These must be the **exact same string**. If they differ, the query and the
stored vectors are in different vector spaces and similarity is random.

Quick check whether they match: log the model name on each side and
compare.

---

## The two secret strings that must match

`WORKER_SHARED_SECRET` (Edge Function Secrets) and Vault `service_role_key`
must be **the exact same string**. The vault uses it to sign requests; the
edge function uses it to verify them. Mismatch = 401s in the function logs
and queue rows stuck pending.

Generate a strong random value once and put it in both places:

```bash
# Linux/Mac (PowerShell example below)
openssl rand -base64 48
```

```powershell
# PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

---

## Setup checklist (cold start)

If you're setting this up from scratch on a new Supabase project:

1. **Run `db/embeddings-setup.sql`** in the Supabase SQL editor. This is
   idempotent — safe to re-run anytime.
2. **Generate a worker secret** (random string).
3. **Add Vault secrets** (Project Settings → Vault):
   - `embeddings_edge_url` = `https://<project-ref>.functions.supabase.co/process-embeddings`
   - `service_role_key` = your generated secret
4. **Deploy the edge function**:
   ```bash
   supabase functions deploy process-embeddings
   ```
5. **Add Edge Function Secrets** (Edge Functions → process-embeddings →
   Manage Secrets):
   - `WORKER_SHARED_SECRET` = the same generated secret as Vault
   - `AI_GATEWAY_API_KEY` = your Vercel AI Gateway key
   - `EMBEDDING_MODEL` = `openai/text-embedding-3-small`
6. **Add `.env.local`** (or your hosting platform's env vars):
   - `EXPO_PUBLIC_SUPABASE_URL` = your project URL
   - `SUPABASE_SECRET_KEY` = your secret key (a.k.a. service role)
   - `EMBEDDING_MODEL` = the **same** value as edge function
   - `EXPO_PUBLIC_API_BASE_URL` (prod only) = your hosted API URL
7. **Backfill** (optional — only needed if `Expense`/`Income` rows already
   exist):
   ```sql
   select * from public.backfill_embeddings();
   ```
   Then check `embedding_queue` for `status = 'done'`.

---

## What happens when secrets are missing

The system fails *gracefully* in a few specific places:

- **Vault secrets missing** → `notify_embedding_worker` logs a warning and
  returns. Triggers still fire, queue rows still get inserted, but nothing
  processes them. They sit at `pending`.
- **Edge function secrets missing** (`WORKER_SHARED_SECRET`,
  `AI_GATEWAY_API_KEY`, `EMBEDDING_MODEL`) → the function returns 500
  with `Server misconfigured`. The pg_net call effectively fails;
  `notify_embedding_worker` doesn't see the response (fire-and-forget).
  Queue rows stay pending.
- **`.env.local` `EMBEDDING_MODEL` missing** → `search-tools.ts` falls
  back to `"openai/text-embedding-3-small"`. This is fine *as long as*
  the edge function is also using that exact string. If the edge
  function uses a different model, you have a silent mismatch.
- **`SUPABASE_SECRET_KEY` missing** → API route fails to construct the
  Supabase client. Token validation fails, every request returns 401.

For each of these, see [troubleshooting.md](troubleshooting.md) for
diagnostic queries and fixes.

---

## Why so many secret stores?

Each store exists for a different reason and they're not unifiable:

- **`.env.local`** — runtime env vars for the Node.js server process.
  Standard 12-factor practice.
- **Edge Function Secrets** — the Deno worker runs in Supabase
  infrastructure, separate from your hosting platform. It can't read your
  Vercel/Render/etc. env vars, so Supabase has its own secret store.
- **Vault** — SQL functions running inside Postgres can't read OS env
  vars. Vault is the only way to give a SQL function access to a secret
  without hard-coding it in the function body.

The duplication between Edge Function Secrets and Vault for the worker
secret is the price of having two separate runtimes
(Postgres-internal SQL function vs. Deno HTTP handler) coordinate via
HTTP.

---

## Rotating secrets

To rotate the worker secret:

1. Generate a new value.
2. Update Vault `service_role_key`.
3. Update Edge Function `WORKER_SHARED_SECRET`.
4. Redeploy the edge function (forces a fresh process to pick up the new
   secret).

To rotate the Supabase secret key (`SUPABASE_SECRET_KEY` in `.env.local`):

1. Issue a new key in Supabase Dashboard.
2. Update `.env.local` (and your prod env vars).
3. Restart the API server (or let the next deploy pick it up).

To rotate the AI Gateway API key:

1. Issue a new key in Vercel AI Gateway settings.
2. Update Edge Function `AI_GATEWAY_API_KEY`.
3. Redeploy the edge function.

To rotate `EMBEDDING_MODEL`:

1. Update both `.env.local` and Edge Function `EMBEDDING_MODEL` to the
   same new value.
2. If the new model has a different vector dimension, run an ALTER TABLE
   on the embedding columns (`vector(N)`) and re-embed everything via
   `backfill_embeddings()`. **Do not skip this step** — pgvector won't
   let you store mismatched-dimension vectors.
