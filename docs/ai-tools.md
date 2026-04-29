# AI Tools Reference

Every tool the LLM can call, organized by file. Each tool is a `tool({...})`
from the Vercel AI SDK with a `description` (what the LLM reads), an
`inputSchema` (Zod schema for validation), and an `execute` function (the
implementation that runs server-side).

All tools accept `profile_id` and `supabase` from the factory function and
scope every DB call by `profile_id`.

---

## File-to-pack mapping

| File | Factory function | What it covers |
|---|---|---|
| [account-tools.ts](../utils/ai-tools/account-tools.ts) | `accountTools(profile_id, supabase)` | Listing accounts |
| [expense-tools.ts](../utils/ai-tools/expense-tools.ts) | `expenseTools(profile_id, supabase)` | Expense insertion flow |
| [income-tools.ts](../utils/ai-tools/income-tools.ts) | `incomeTools(profile_id, supabase)` | Income insertion flow |
| [query-tools.ts](../utils/ai-tools/query-tools.ts) | `queryTools(profile_id, supabase)` | Structured SQL queries |
| [search-tools.ts](../utils/ai-tools/search-tools.ts) | `searchTools(profile_id, supabase, gateway)` | Semantic vector search |

Wired into the chat route:
[app/api/chat/+api.ts](../app/api/chat/+api.ts):

```typescript
tools: {
  ...expenseTools(userId, supabase),
  ...incomeTools(userId, supabase),
  ...accountTools(userId, supabase),
  ...searchTools(userId, supabase, gateway),
  ...queryTools(userId, supabase),
},
```

---

## Account tools

### `listAccounts`

Reads all of the user's accounts from `account` table.

| Field | Value |
|---|---|
| Input | `{}` |
| Returns | Array of `AccountRow` (id, name, type, balance, currency, ...) or string error |
| Side effects | None |
| Halts stream | No |

Used when the user asks something like "what accounts do I have". For
balance summaries, `getAccountBalanceSummary` (in `query-tools`) is more
useful because it also computes net worth.

---

## Expense tools

Five tools that drive the expense insertion flow. See
[chatbot-flows.md](chatbot-flows.md) for transcripts.

### `getAccountsAndCategoriesForSelection`

Step 1 of the expense flow. Fetches accounts and expense categories so the
client can render the account picker.

| Field | Value |
|---|---|
| Input | `{}` |
| Returns | `{ accounts, categories, message }` or string error |
| Side effects | None |
| Halts stream | **Yes** (in `stopWhen`) |

The returned `accounts` and `categories` are pre-shaped for the picker UI
(`label`, `value`, etc.). The AI is told to remember whether `categories`
was empty — that decides whether the next step uses
`requestNewExpenseCategoryName` (zero-categories branch) or
`getExpenseCategoriesForSelection` (existing-categories branch).

### `requestNewExpenseCategoryName`

Used only on the very first expense (zero categories). Renders a UI prompt
asking the user to confirm/edit a suggested category name.

| Field | Value |
|---|---|
| Input | `{ description, suggestion }` (suggestion 1–50 chars) |
| Returns | `{ description, suggestion, message }` |
| Side effects | None — no DB write |
| Halts stream | **Yes** (in `stopWhen`) |

The AI passes a sensible suggestion derived from the description. The
suggestion catalog is in the system prompt (e.g. "Coffee" → "Food").

### `createExpenseCategory`

Inserts into `Expense_category`. Case-insensitive duplicate check returns
the existing row instead of creating a new one.

| Field | Value |
|---|---|
| Input | `{ category_name }` (1–50 chars) |
| Returns | `{ success, categoryId, categoryName, message }` |
| Side effects | INSERT into `Expense_category` (or no-op on duplicate) |
| Halts stream | No |

Always called in the zero-categories branch right before `insertExpense`,
or after the user picks "+ Create new category" from the existing-categories
picker.

### `getExpenseCategoriesForSelection`

Step 2 (existing-categories branch). Fetches categories so the client can
render the category picker.

| Field | Value |
|---|---|
| Input | `{}` |
| Returns | `{ categories, message }` |
| Side effects | None |
| Halts stream | **Yes** (in `stopWhen`) |

### `insertExpense`

The only tool that writes a row in `Expense`. Validates `accountId` and
`categoryId` belong to the user (returns an error string if not), inserts
the expense, then updates the account's balance.

| Field | Value |
|---|---|
| Input | `{ accountId, amount, description, categoryId }` |
| Returns | `{ success, message, details: { amount, description, account, category, oldBalance, newBalance } }` |
| Side effects | INSERT into `Expense`, UPDATE `account.balance` |
| Halts stream | No |

**Balance math:** for credit accounts, expense *increases* balance (more
debt owed). For debit/checking/savings, expense *decreases* balance.

The `transaction_date` is set to `new Date().toISOString()` — the row is
always timestamped at insertion time. There is no way through the chatbot
to back-date an expense.

---

## Income tools

Mirror the expense tools exactly. Differences:

| Expense | Income |
|---|---|
| `Expense_category` | `Income_category` |
| `description` | `source_description` |
| `expense_categoryid` | `income_categoryid` |
| Credit account: balance ↑ | Credit account: balance ↓ (reduces debt owed) |
| Debit account: balance ↓ | Debit account: balance ↑ |

The five tools are:

- `getAccountsAndIncomeCategoriesForSelection`
- `requestNewIncomeCategoryName`
- `createIncomeCategory`
- `getIncomeCategoriesForSelection`
- `insertIncome`

`insertIncome` does **not** set `transaction_date`; it lets `created_at`
default to `now()` in Postgres. Income is queried by `created_at` (see
`queryIncomesByDateRange`).

---

## Query tools — structured SQL

Five tools for numeric/date-range/aggregate questions. No embeddings
needed — these run plain SQL against `Expense`, `Income`, and `account`.

### `queryExpensesByDateRange`

| Field | Value |
|---|---|
| Input | `{ startDate, endDate, categoryId?, categoryName?, accountId?, accountName? }` |
| Returns | `{ count, total, startDate, endDate, transactions[] }` |
| Side effects | None |
| Halts stream | No |

Date strings must match `YYYY-MM-DD` or full ISO 8601. If only a date is
passed, the server pads to full timestamps (`T00:00:00.000Z` start,
`T23:59:59.999Z` end) so same-day transactions aren't excluded by
timezone math.

If `categoryName` or `accountName` is passed, the server `ilike`-looks-up
the matching ID and returns an error if not found. The AI is told (in the
system prompt) to pass *names*, not IDs — the LLM doesn't have the IDs.

### `queryIncomesByDateRange`

Same shape, but queries `Income` filtered by `created_at` (not
`transaction_date`). Returns `source_description` instead of `description`.

### `getCategoryTotals`

| Field | Value |
|---|---|
| Input | `{ kind: "expense" \| "income", startDate, endDate }` |
| Returns | `{ kind, startDate, endDate, grandTotal, breakdown[] }` |
| Side effects | None |
| Halts stream | No |

Aggregates by category client-side after fetching rows. Sorted descending
by total. Used for "what categories did I spend the most on" type
questions.

### `getNetChange`

| Field | Value |
|---|---|
| Input | `{ startDate, endDate, accountId?, accountName? }` |
| Returns | `{ totalIncome, totalExpenses, netChange, summary }` |
| Side effects | None |
| Halts stream | No |

Two parallel queries (income + expense), then `totalIncome -
totalExpenses`. `summary` is a human-readable string. Used for "how much
did I save this month", "was I up or down last month".

### `getAccountBalanceSummary`

| Field | Value |
|---|---|
| Input | `{}` |
| Returns | `{ accounts[], totals: { assets, liabilities, netWorth } }` |
| Side effects | None |
| Halts stream | No |

Splits accounts by `account_type === "credit"`: credit balances count as
liabilities, everything else counts as assets. `netWorth = assets -
liabilities`.

---

## Search tools — semantic vector search

Two tools for content/context questions. These embed the user's query
string with the AI Gateway, then call a Postgres RPC (`match_expenses` /
`match_incomes`) that uses cosine similarity against the HNSW index on the
embedding column.

The factory takes a third arg, `gateway`, because it needs to embed the
query at runtime:

```typescript
searchTools(userId, supabase, gateway)
```

### `searchExpensesSemantic`

| Field | Value |
|---|---|
| Input | `{ query, limit?, threshold? }` (limit ≤ 25, threshold 0–1) |
| Returns | `{ matches: [{ description, amount, transaction_date, similarity }], count }` |
| Side effects | None |
| Halts stream | No |

`threshold` defaults to 0.3. Rows with cosine similarity below this are
filtered out. Default `limit` is 10.

The query embedding uses the model from `process.env.EMBEDDING_MODEL` (or
falls back to `"openai/text-embedding-3-small"`). **Must match** the
edge-function-side model that produced the stored embeddings, or
similarity is meaningless.

### `searchIncomesSemantic`

Same shape, queries `Income` and returns `source_description` and
`created_at` instead of `description` and `transaction_date`.

---

## Tool description tips

The `description` field is the LLM's only signal for *when* to call a
tool. A few patterns we've used:

- Lead with **what** the tool does in one sentence.
- Then say **when** to use it (positive examples).
- Then say **when not** to use it (negative examples or "never X without
  Y first").
- For tools that halt the stream, mention that the stream halts and the
  user must respond first — otherwise the model tries to chain calls.

Example, from `requestNewExpenseCategoryName`:

> Render a UI prompt asking the user to confirm or edit a name for a new
> expense category. Use ONLY when the user has zero expense categories.
> Pass a sensible suggestion derived from the transaction description. Do
> NOT call createExpenseCategory or insertExpense in the same turn — the
> stream halts after this call and the user must respond first.

---

## Adding a new tool

1. Decide which file it belongs in (or create a new pack).
2. Add to the factory's returned object.
3. Re-export from [index.ts](../utils/ai-tools/index.ts) if needed.
4. Spread into `tools: { ... }` in `+api.ts`.
5. If it must halt the stream, add `hasToolCall("<name>")` to `stopWhen`.
6. If it overlaps with another tool's domain, add a routing example to the
   system prompt's **RETRIEVAL RULES**.

See [chat-api.md](chat-api.md) for the prompt structure.
