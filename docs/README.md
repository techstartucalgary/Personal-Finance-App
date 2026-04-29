# AI Chatbot — Feature Documentation

Documentation for the Sterling chatbot feature: the chat API, the AI tools,
the embedding pipeline that powers semantic search, and the configuration
that holds it together.

Scope of this folder: the chatbot feature only. App-wide setup (Expo, native
builds, auth) lives in the [project root README](../README.md).

---

## Quick start (local dev)

1. **Create `.env.local`** at the project root with Supabase credentials:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SECRET_KEY=your_service_role_key_here
   EMBEDDING_MODEL=openai/text-embedding-3-small
   ```
   See [configuration.md](configuration.md#local-development-setup--envlocal) for
   where to find each value.

2. **Start the dev server:** `npx expo start`

3. **Run the mobile app:** scan QR code or `npx expo run:ios` / `npx expo run:android`

Chatbot is at the chat tab. The API route runs on the same Expo origin and
will auto-connect.

---

## Full reading order

If you're new to the chatbot architecture, read in this order:

1. **[architecture.md](architecture.md)** — the mental model. How the pieces
   fit together: client → API route → AI SDK → tools → Supabase. The hybrid
   retrieval split (structured SQL vs. semantic search). Read this first.
2. **[chat-api.md](chat-api.md)** — the entry point. `app/api/chat/+api.ts`,
   the system prompt, tool wiring, and `stopWhen` halt conditions.
3. **[ai-tools.md](ai-tools.md)** — every tool the AI can call, categorized
   (expense flow, income flow, accounts, query, search). Inputs, outputs,
   side effects, when each one is used.
4. **[chatbot-flows.md](chatbot-flows.md)** — turn-by-turn user/assistant
   transcripts for expense and income insertion.
5. **[embeddings.md](embeddings.md)** — the embedding pipeline.
   `db/embeddings-setup.sql` (extensions, queue, triggers, RPCs) and
   `supabase/functions/process-embeddings/index.ts` (the Deno worker).
   Hybrid retrieval explained.
6. **[configuration.md](configuration.md)** — every environment variable,
   every Supabase Vault secret, every Edge Function secret. Where each one
   is read and why.
7. **[troubleshooting.md](troubleshooting.md)** — symptoms and fixes for
   issues we've already hit (rate limits, key mismatches, model mismatches,
   embeddings stuck pending).

---

## TL;DR — what the chatbot does

Users talk to the chatbot to:

- **Add expenses** ("spent $50 at Starbucks") — UI picker flow lands the row
  in the `Expense` table and updates the chosen account's balance.
- **Add income** ("got paid $2000") — same shape, lands in `Income`.
- **Ask questions** ("how much did I spend in March?", "find that
  subscription I cancelled") — answered by either a structured SQL query
  tool or a semantic vector search, depending on the question.

The two question paths are the **hybrid retrieval** system:

| User asks | Tool used |
|---|---|
| Numeric / date-range / aggregate | `query*` tools (SQL on `Expense`/`Income`) |
| Content / context / location keyword in description | `search*Semantic` tools (cosine similarity on embeddings) |
| Mixed (e.g. "how much at work?") | `search*Semantic` first, then sum from results |

See [architecture.md](architecture.md) for the full mental model.

---

## File map (chatbot-related code)

| Path | What it does |
|---|---|
| [app/api/chat/+api.ts](../app/api/chat/+api.ts) | Chat API route. System prompt, tool wiring, `stopWhen` halts. |
| [app/(tabs)/chatAI.tsx](../app/(tabs)/chatAI.tsx) | Client UI. Renders messages, account/category pickers, voice input. |
| [utils/apiUrlGenerator.ts](../utils/apiUrlGenerator.ts) | Resolves the API URL for dev (Expo origin) vs prod (`EXPO_PUBLIC_API_BASE_URL`). |
| [utils/ai-tools/expense-tools.ts](../utils/ai-tools/expense-tools.ts) | Tools for the expense insertion flow (5 tools). |
| [utils/ai-tools/income-tools.ts](../utils/ai-tools/income-tools.ts) | Tools for the income insertion flow (5 tools). |
| [utils/ai-tools/account-tools.ts](../utils/ai-tools/account-tools.ts) | `listAccounts`. |
| [utils/ai-tools/query-tools.ts](../utils/ai-tools/query-tools.ts) | Structured SQL queries (date ranges, totals, breakdowns, balances). |
| [utils/ai-tools/search-tools.ts](../utils/ai-tools/search-tools.ts) | Semantic search via pgvector + Vercel AI Gateway embeddings. |
| [utils/ai-tools/index.ts](../utils/ai-tools/index.ts) | Barrel export. |
| [db/embeddings-setup.sql](../db/embeddings-setup.sql) | All embedding infrastructure SQL — idempotent, paste into Supabase SQL editor. |
| [supabase/functions/process-embeddings/index.ts](../supabase/functions/process-embeddings/index.ts) | Deno edge worker that consumes the embedding queue. |

---

## Conventions

- **profile_id** — always the Supabase Auth user UUID. Every DB row is scoped
  by this. The chat route validates the bearer token and resolves it before
  any tool runs.
- **Tool naming** — `get*` and `search*` are read-only; `insert*`, `create*`,
  and `update*` write. Tools that render UI pickers halt the stream (see
  `stopWhen` in [chat-api.md](chat-api.md)).
- **IDs vs. names** — IDs never appear in chat. The AI passes IDs to insert
  tools, the server validates them and looks up names for the confirmation
  message.
- **Error returns** — tools return *strings* on user-facing errors so the AI
  can relay them. Exceptions only escape for genuinely unexpected failures.
