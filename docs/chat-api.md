# Chat API

The single entry point for the chatbot. Every user message comes through
[`app/api/chat/+api.ts`](../app/api/chat/+api.ts).

This doc walks the file top to bottom, then explains the system prompt and
why each piece of it exists.

---

## Request lifecycle

```
client                    server                        AI Gateway / DB
  │                         │                                 │
  │  POST /api/chat         │                                 │
  │  { messages, token,     │                                 │
  │    profile_id }         │                                 │
  ├────────────────────────►│                                 │
  │                         │                                 │
  │                         │ 1. parse body                   │
  │                         │ 2. validate token               │
  │                         │    (supabase.auth.getUser)      │
  │                         │ 3. create gateway w/ long       │
  │                         │    timeout (15 min)             │
  │                         │                                 │
  │                         │ 4. streamText({                 │
  │                         │      model: gemini-2.5-flash-   │
  │                         │             lite,               │
  │                         │      system: <prompt>,          │
  │                         │      tools: { ...all five      │
  │                         │              tool packs },     │
  │                         │      stopWhen: [...]            │
  │                         │    })                           │
  │                         │                                 │
  │                         │  ◄──── streams text/tool ──────►│
  │                         │       calls + results           │
  │                         │                                 │
  │  ◄─── UI message stream │                                 │
  │       (text + tool      │                                 │
  │        calls + results) │                                 │
  │                         │                                 │
```

---

## File walkthrough

The route is a single `POST` handler. Numbered references below correspond
to logical sections; the actual file order matches.

### 1. Imports & body parsing

```typescript
const requestData = await req.json();
const messages = requestData.messages;
const token = requestData.token;
```

Body shape sent by [chat-ai.tsx](../app/chat-ai.tsx) via the
`DefaultChatTransport`:

- `messages` — full conversation history, including tool calls and results
  from earlier turns. The AI SDK is responsible for the shape; we just pass
  it through `convertToModelMessages()`.
- `token` — Supabase JWT (`session.access_token`).
- `profile_id` — also passed but resolved server-side from the token instead
  (we trust the token, not the body field).

### 2. Supabase client

```typescript
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);
```

The route uses the **secret key** (formerly known as service role key in old
Supabase docs), not the anon key. This bypasses RLS so the route can
read/write any user's data — security relies on the route's own
`profile_id` filtering on every query.

### 3. Token validation

```typescript
const { data, error } = await supabase.auth.getUser(token);
userId = data.user?.id || null;
```

Returns 401 if the token is invalid or missing. Returns 400 if `userId`
ends up null. Every downstream tool uses this `userId` as `profile_id`.

### 4. Gateway client

```typescript
const gateway = createGateway({
  fetch: (url, init) =>
    fetch(url, {
      ...init,
      dispatcher: new Agent({
        headersTimeout: 15 * 60 * 1000, // 15 minutes
        bodyTimeout: 15 * 60 * 1000,
      }),
    }),
});
```

Custom `undici` Agent with 15-minute timeouts. Default fetch timeouts (~30s)
can fire mid-stream on long tool chains; the long timeout prevents that.

### 5. `streamText({ ... })`

The core call. Three things to know:

- **model**: `gateway("google/gemini-2.5-flash-lite")`. Cheap and fast. The
  routing rules in the system prompt are explicit because flash-lite needs
  hand-holding compared to a stronger model. If the AI starts misrouting
  consistently, switching to a stronger model is a valid fix.
- **system**: a long string of routing rules and step-by-step transaction
  flows. Detailed below.
- **tools**: spread of `expenseTools`, `incomeTools`, `accountTools`,
  `searchTools`, `queryTools`. Each pack returns an object of tool
  definitions; spreading them merges them into one tools registry.

### 6. `stopWhen`

```typescript
stopWhen: [
  stepCountIs(5),
  hasToolCall("getAccountsAndCategoriesForSelection"),
  hasToolCall("getAccountsAndIncomeCategoriesForSelection"),
  hasToolCall("getExpenseCategoriesForSelection"),
  hasToolCall("getIncomeCategoriesForSelection"),
  hasToolCall("requestNewExpenseCategoryName"),
  hasToolCall("requestNewIncomeCategoryName"),
],
```

These are halt conditions. When any of them fires, the stream ends. Why:

- `stepCountIs(5)` — runaway protection. Five tool-call iterations is the
  ceiling per user message.
- The picker / prompt tools — the UI needs to render a picker and wait for
  the user's response. If we kept generating, the AI would invent fake
  selections and call `insertExpense` immediately. Halting forces a new
  user turn.

After a halt, the next user message restarts the conversation. The AI must
reconstruct context from history (see "State the AI carries across turns"
in [chatbot-flows.md](chatbot-flows.md)).

### 7. Response

```typescript
return result.toUIMessageStreamResponse({
  headers: {
    "Content-Type": "application/octet-stream",
    "Content-Encoding": "none",
  },
});
```

Streams the AI SDK's UI message protocol back to the client. The Expo
client uses `useChat()` to consume it.

`Content-Encoding: none` is set because some Expo proxy layers were
double-compressing and breaking the stream.

---

## The system prompt

The prompt is a single template string. It has five sections:

### A. Role & purpose

> You are the Sterling Financial Engine, a high-precision financial
> analyzer and advisor.

Sets the persona. Short.

### B. RETRIEVAL RULES

The most important section. Decides whether to call `query*` or
`search*Semantic` for any question. Rules summary:

| Question shape | Tool family |
|---|---|
| Pure aggregate / date range | `query*` |
| Net change / savings / profit | `getNetChange` |
| Descriptive keyword in description text | `search*Semantic` |
| Mixed (descriptive + numeric) | `search*Semantic` first, sum from results |

Specific examples that map to `search*Semantic`:

- "coffee shops" → query: "coffee"
- "at work" → query: "at work"
- "during lunch" → query: "lunch"
- "that subscription I cancelled" → query: "subscription"
- "streaming services" → query: "streaming"

The "at work" / "at a restaurant" examples are explicit because earlier
versions of the prompt let the model refuse these as "location queries we
don't support". The semantic search runs against transaction *description
text*, so "at work" maps to descriptions containing the word "work" — it's
not a GPS filter.

### C. DATE RANGE COMPUTATION

Hard-coded calendar examples for "this month", "last month", "this year",
"last week", etc. The model gets the current date injected as context and
computes ranges from these rules. Without explicit examples, models
hallucinate plausible-looking but wrong dates.

### D. CRITICAL RULES (transaction flow)

Numbered hard rules for the insertion flow:

1. **Never stream text after a picker tool.** The picker output is the
   message — anything after it confuses the UI.
2. **STOP immediately after picker tool calls.** Reinforces #1.
3. **Only continue after the user responds.** The new user message is the
   trigger.
4. **NEVER REVEAL IDs to users.** IDs are an implementation detail.
5. **ALWAYS USE ACCOUNT NAMES** in conversation.
6. **NEVER ask the user to confirm** before `insertExpense`/`insertIncome`.
   The picker is the confirmation. Asking again is annoying and the model
   was doing it.

### E. Step-by-step flows

Two parallel flows: Expense Transaction Flow and Income Transaction Flow.
Each has 6 steps. See [chatbot-flows.md](chatbot-flows.md) for the
turn-by-turn version.

The flow descriptions tell the AI:
- When to call which tool.
- What to remember between turns (amount, description, accountId,
  categoryId).
- How to handle the "zero categories" branch
  (`requestNew*CategoryName` → user reply → `create*Category` → `insert*`).
- Exact format string for the success message.

### F. Category-name suggestions

A lookup table the AI uses when seeding the suggestion field of
`requestNewExpenseCategoryName` / `requestNewIncomeCategoryName`. E.g.
"Coffee" → "Food", "Uber" → "Transportation". Used only on the very first
transaction (zero-categories branch).

---

## Why this prompt is so prescriptive

Two reasons:

1. **The model is small.** `gemini-2.5-flash-lite` is cheap but doesn't
   reliably make judgment calls. Examples and explicit decision rules pay
   off more than terse rules-only prompts.
2. **The flow has hard constraints.** Picker tools must halt. Confirmation
   messages must format precisely. The prompt has to enforce these because
   stream halts and DB inserts are not recoverable from a vague prompt.

If you swap to a stronger model later, you can probably trim the prompt
significantly. Until then, treat additions to it as load-bearing.

---

## Adding a new tool

1. Define the tool in `utils/ai-tools/<area>-tools.ts` using `tool({...})`
   from the `ai` package. Give it a clear `description` — that's what the
   LLM reads to decide when to call it.
2. Export from the file.
3. Re-export from [utils/ai-tools/index.ts](../utils/ai-tools/index.ts) if
   needed.
4. Spread the tool pack in `+api.ts` `tools: { ... }`.
5. If it should halt the stream, add `hasToolCall("<name>")` to `stopWhen`.
6. If routing is ambiguous, update the **RETRIEVAL RULES** section of the
   system prompt with an example.

See [ai-tools.md](ai-tools.md) for the existing tools' patterns.
