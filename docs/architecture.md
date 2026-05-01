# Architecture

This is the mental model. If you only read one document, read this one — the
rest of the docs are implementation details that hang off this picture.

---

## The big picture

```
┌─────────────────────────┐                ┌──────────────────────────┐
│   Mobile / Web Client   │                │   Vercel AI Gateway      │
│   app/(tabs)/chatAI.tsx │                │   - LLM (Gemini)         │
│   - useChat() hook      │                │   - Embeddings (OpenAI)  │
│   - Pickers & UI prompts│                └────────────┬─────────────┘
└────────────┬────────────┘                             │
             │  POST /api/chat                          │
             │  { messages, token, profile_id }         │
             ▼                                          │
┌─────────────────────────┐                             │
│   API Route (server)    │  streamText()               │
│   app/api/chat/+api.ts  │ ◄──── tool calls ──────────►│
│   - validates token     │       (LLM picks tools)     │
│   - constructs prompt   │                             │
│   - wires tools         │                             │
│   - stopWhen halts      │                             │
└────────────┬────────────┘                             │
             │ tool execute()                           │
             ▼                                          │
┌─────────────────────────────────────────┐             │
│   Supabase (Postgres)                   │             │
│   - account, Expense, Income, *_category│             │
│   - embedding columns (vector(1536))    │             │
│   - HNSW indexes                        │             │
│   - embedding_queue                     │             │
│   - triggers (enqueue on insert/update) │             │
│   - match_expenses / match_incomes RPCs │             │
└──────┬──────────────────────────────────┘             │
       │ pg_net.http_post (queue notification)          │
       ▼                                                │
┌─────────────────────────────────────────┐             │
│   Edge Function (Deno)                  │ ────────────┘
│   supabase/functions/process-embeddings │   (calls Gateway for vectors)
│   - reads queue row                     │
│   - calls Gateway embeddings endpoint   │
│   - writes vector back to source row    │
│   - marks queue done / failed / retry   │
└─────────────────────────────────────────┘
```

Every box is a separate process boundary. Tracing a request through these
boxes is the single most important thing to understand.

---

## Two kinds of requests, one chat surface

Every user message lands at `/api/chat`. From there, the LLM decides what to
do. There are two macro-patterns:

### 1. Insert flow ("spent $50 at Starbucks")

The AI calls a sequence of tools that render pickers and finally insert a
row. The conversation halts after each picker so the user can respond.

See [chatbot-flows.md](chatbot-flows.md) for full transcripts.

### 2. Question flow ("how much did I spend in March?")

The AI picks **one** retrieval path:

- **Structured SQL** (`query*` tools) for numeric/date-range questions.
  Exact, fast, no embedding needed.
- **Semantic search** (`search*Semantic` tools) for content/context
  questions. Embeds the user's query, runs cosine similarity against the
  HNSW index, returns the closest descriptions.

The system prompt has explicit routing rules ([chat-api.md](chat-api.md)).
When in doubt, the AI prefers `query*` for numbers and `search*Semantic` for
descriptive keywords ("at work", "coffee shops", "subscription").

### Mixed questions

"How much have I spent at work?" has both a content filter ("at work") and a
numeric ask ("how much"). The rule: **search first, sum from the results**.
Never call a `query*` tool, because it would aggregate every transaction
ignoring the context filter.

---

## Hybrid retrieval — why both paths exist

A single retrieval mechanism can't answer every question well:

| If we used only structured SQL | If we used only semantic search |
|---|---|
| ✅ Exact totals, exact dates | ❌ Can't sum precisely (top-k limit) |
| ❌ Can't match fuzzy descriptions | ✅ Matches "at work", "coffee shop" |
| ❌ User must remember category names | ✅ Free-text filtering |
| ✅ Fast (indexed scans) | ⚠️ Requires embedded rows |

So the design is: **route by question shape**. The LLM is the router, the
system prompt is the routing logic. Each tool's `description` field is what
the LLM reads to decide.

---

## Why the embedding pipeline is async

Generating an embedding takes ~200–500ms (network round trip to the AI
Gateway). If we did it inline during `INSERT INTO Expense`, every transaction
insert would block the user for half a second and tie the request to the
gateway being up.

Instead:

1. Trigger fires on `INSERT`/`UPDATE` of `description` / `source_description`.
2. Trigger inserts a row into `embedding_queue` (one cheap local insert).
3. Trigger calls `notify_embedding_worker(queue_id)` which uses
   `pg_net.http_post` to asynchronously fire an HTTP request to the edge
   function. **This call returns instantly** — pg_net buffers and sends the
   request in the background.
4. The user's INSERT commits immediately. Whether the embedding succeeds is
   irrelevant to the user-facing transaction.
5. The edge function processes the queue row, generates the vector, and
   updates the source row's `embedding` column.
6. Failed rows are retried (up to 3 attempts) or marked `failed`.

The trigger never blocks. The user never waits. If the gateway is down, the
queue accumulates and gets backfilled later.

See [embeddings.md](embeddings.md) for the queue lifecycle in detail.

---

## Two deployment targets, one repo

The Expo project produces two build outputs:

- **Native binaries** (iOS/Android) — built with `npx expo run:ios` /
  `expo run:android`. The mobile app makes HTTP calls to the API route's
  deployed URL (e.g. Vercel). The mobile app does not run server code.
- **Server bundle** — the `app/api/chat/+api.ts` route runs server-side (on
  Vercel or wherever you host the Expo Router server). Server code has
  access to `SUPABASE_SECRET_KEY`, etc.

[utils/apiUrlGenerator.ts](../utils/apiUrlGenerator.ts) is the glue: in dev
it returns the Expo origin (everything is local); in prod it returns
`EXPO_PUBLIC_API_BASE_URL`, the deployed server URL.

---

## Three places where models matter

There are *three* model references in the system, and they must agree:

| Location | What it embeds/generates |
|---|---|
| Edge Function `EMBEDDING_MODEL` env var | Embeds row text on insert |
| `.env.local` `EMBEDDING_MODEL` env var | Embeds the user's query in `search-tools.ts` |
| `gateway("google/gemini-2.5-flash-lite")` in `+api.ts` | The chat LLM |

The two `EMBEDDING_MODEL` values **must be the exact same string** (e.g.
`openai/text-embedding-3-small`). If they don't match, the query embedding
is in a different vector space than the stored embeddings and similarity is
random — search returns nothing or garbage.

The chat LLM is independent and can be any chat-capable model the gateway
supports.

See [configuration.md](configuration.md) for every env var.

---

## Security model

- **Auth** — every chat request includes the user's Supabase JWT in the
  request body. The server verifies it with `supabase.auth.getUser(token)`
  before doing anything. The resolved `userId` (a.k.a. `profile_id`) is what
  every tool uses to scope DB queries.
- **Service role key** — the chat route uses the Supabase secret key (not
  anon) so it can read/write any user's data. RLS doesn't protect against
  the secret key, so the route's own `eq("profile_id", userId)` filters are
  the security boundary.
- **Edge function auth** — the edge function is called by `pg_net` from the
  database. It checks an `Authorization: Bearer <WORKER_SHARED_SECRET>`
  header. The vault stores the same secret under `service_role_key` (legacy
  name; it's actually the worker secret). See
  [configuration.md](configuration.md) for why the dedicated secret exists.
- **Embedding queue RLS** — RLS is enabled with no policies, so anon and
  authenticated roles cannot read/write. Only service role bypasses RLS.

---

## What lives where

| Concern | Where it's handled |
|---|---|
| User auth | Client passes JWT; server validates; profile_id used everywhere |
| Tool schemas | `inputSchema: z.object(...)` in each tool file |
| Tool descriptions (LLM-facing) | The `description: "..."` field on each tool |
| Routing rules (which tool when) | System prompt in `app/api/chat/+api.ts` |
| Stream halting after pickers | `stopWhen` array in `streamText()` config |
| Balance updates | `insertExpense` / `insertIncome` recalculate after insert |
| Vector dimensions | 1536 (OpenAI `text-embedding-3-small`) |
| Vector index type | HNSW with `vector_cosine_ops` |
| Similarity formula | `1 - (embedding <=> query_embedding)` (cosine similarity) |
| Default match threshold | 0.3 (tunable per call) |
| Default match count | 10 (max 25) |
| Max embedding retry attempts | 3 |
