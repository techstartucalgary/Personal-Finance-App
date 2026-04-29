# Chatbot Transaction Flows

Covers every path through the AI chatbot for inserting expenses and income.
Each flow is a sequence of turns between the user and the server (`POST /api/chat`).

---

## Tools involved

| Tool | Side effect | Halts stream? |
|---|---|---|
| `getAccountsAndCategoriesForSelection` | None (read) | Yes |
| `getAccountsAndIncomeCategoriesForSelection` | None (read) | Yes |
| `getExpenseCategoriesForSelection` | None (read) | Yes |
| `getIncomeCategoriesForSelection` | None (read) | Yes |
| `requestNewExpenseCategoryName` | None (UI prompt only) | Yes |
| `requestNewIncomeCategoryName` | None (UI prompt only) | Yes |
| `createExpenseCategory` | Writes to `Expense_category` | No |
| `createIncomeCategory` | Writes to `Income_category` | No |
| `insertExpense` | Writes to `Expense`, updates `account.balance` | No |
| `insertIncome` | Writes to `Income`, updates `account.balance` | No |

"Halts stream" means the API response ends immediately after the tool executes.
The UI renders the tool output and the user must respond before the next AI turn begins.

---

## Expense Flows

### Path A — Existing categories, user picks one

```
User:  "spent $50 at Starbucks"
AI:    → getAccountsAndCategoriesForSelection()          [stream halts]
UI:    Account picker renders

User:  [taps account, taps Confirm]
       → "I selected Debit #1 account. Please complete the transaction."
AI:    → getExpenseCategoriesForSelection()              [stream halts]
UI:    Category picker renders (existing categories + "+ Create new category" row)

User:  [taps existing category, taps Confirm Selection]
       → "I selected Food category. Please complete the transaction."
AI:    → insertExpense({ accountId, amount, description, categoryId })
         Server validates accountId and categoryId belong to user,
         fetches account_name/account_type/balance/category_name from DB,
         inserts row in Expense, updates account.balance
AI:    ✅ Expense recorded!
       • Description: Starbucks
       • Amount: $50
       • Category: Food
       • Account: Debit #1
       • Previous balance: $1000 → New balance: $950
```

---

### Path B — Existing categories, user creates a new one from the picker

```
User:  "spent $120 at Best Buy"
AI:    → getAccountsAndCategoriesForSelection()          [stream halts]
UI:    Account picker

User:  [picks account]
       → "I selected Debit #1 account. Please complete the transaction."
AI:    → getExpenseCategoriesForSelection()              [stream halts]
UI:    Category picker renders

User:  [taps "+ Create new category", types "Electronics", taps Create and Use]
       → "Use the name 'Electronics' for my new category."
AI:    → createExpenseCategory({ category_name: "Electronics" })
         Server checks no duplicate, inserts into Expense_category, returns { categoryId, categoryName }
       → insertExpense({ accountId, amount, description, categoryId })
         Server validates IDs, inserts, updates balance
AI:    ✅ Expense recorded!
       • Description: Best Buy
       • Amount: $120
       • Category: Electronics
       • Account: Debit #1
       • Previous balance: $950 → New balance: $830
```

**Duplicate guard:** if the typed name already exists (case-insensitive), `createExpenseCategory`
returns the existing category's ID and a message saying it was reused — no duplicate is created.

---

### Path C — Zero expense categories (first transaction ever)

```
User:  "spent $30 at McDonald's"
AI:    → getAccountsAndCategoriesForSelection()
         categories list is empty → AI notes this            [stream halts]
UI:    Account picker

User:  [picks account]
       → "I selected Debit #1 account. Please complete the transaction."
AI:    → requestNewExpenseCategoryName({ description: "McDonald's", suggestion: "Food" })
                                                             [stream halts]
UI:    Input prompt renders, TextInput prefilled with "Food"

User:  [edits or accepts name, taps Use this name]
       → "Use the name 'Food' for my new category."
AI:    → createExpenseCategory({ category_name: "Food" })
       → insertExpense({ accountId, amount, description, categoryId })
AI:    ✅ Expense recorded!
       ...
```

---

### Validation failures (all paths)

If `insertExpense` receives an `accountId` that does not exist in `account` for this user,
or a `categoryId` that does not exist in `Expense_category` for this user, the tool returns
an error string instead of inserting. The AI then re-calls `getAccountsAndCategoriesForSelection`
or `getExpenseCategoriesForSelection` to obtain valid IDs and retries.

---

## Income Flows

Income flows mirror the expense flows exactly. The differences are:

| Expense | Income |
|---|---|
| `getAccountsAndCategoriesForSelection` | `getAccountsAndIncomeCategoriesForSelection` |
| `getExpenseCategoriesForSelection` | `getIncomeCategoriesForSelection` |
| `requestNewExpenseCategoryName` | `requestNewIncomeCategoryName` |
| `createExpenseCategory` | `createIncomeCategory` |
| `insertExpense` | `insertIncome` |
| table `Expense` | table `Income` |
| field `description` | field `source_description` |
| balance: credit adds, debit subtracts | balance: credit subtracts (reduces owed), debit adds |

### Path A — Existing income categories, user picks one

```
User:  "received $2000 paycheck"
AI:    → getAccountsAndIncomeCategoriesForSelection()    [stream halts]
UI:    Account picker

User:  [picks account]
AI:    → getIncomeCategoriesForSelection()               [stream halts]
UI:    Category picker (existing income categories + "+ Create new category")

User:  [picks "Salary"]
       → "I selected Salary category. Please complete the transaction."
AI:    → insertIncome({ accountId, amount, source_description, categoryId })
AI:    ✅ Income recorded!
       • Description: paycheck
       • Amount: $2000
       • Category: Salary
       • Account: Checking
       • Previous balance: $500 → New balance: $2500
```

### Path B — Create new income category from picker

Same shape as Expense Path B but calling `createIncomeCategory` and `insertIncome`.

### Path C — Zero income categories (first income ever)

Same shape as Expense Path C but calling `requestNewIncomeCategoryName`,
`createIncomeCategory`, and `insertIncome`.

---

## State the AI must carry across turns

Because the stream halts at picker/prompt tool calls, the AI reconstructs context from
conversation history on each new turn. It must remember:

- **amount** — from the user's original message
- **description / source_description** — from the user's original message
- **accountId** — from the tool result of `getAccounts*ForSelection` (matched to the name the user sent)
- **categoryId** — from either the `getExpenseCategories*` tool result (matched to the name the user sent) or from the `createExpenseCategory` / `createIncomeCategory` return value

None of these are passed through the UI — the client only sends text messages naming accounts and categories. IDs are always resolved server-side from those names or returned by the create tools.

---

## Turn count per path

| Path | Turns to completion |
|---|---|
| A (existing categories) | 3 user turns |
| B (create new from picker) | 3 user turns |
| C (zero categories) | 3 user turns |

All paths take the same number of user turns. Path C adds one extra AI tool call
(`requestNew*CategoryName` → `create*Category`) but no extra user interaction beyond
confirming the category name.
