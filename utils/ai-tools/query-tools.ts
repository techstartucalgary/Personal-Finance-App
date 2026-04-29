import { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Date must be ISO 8601 (YYYY-MM-DD or full timestamp)");

export const queryTools = (profile_id: string, supabase: SupabaseClient) => ({
  // ---------------------------------------------------------------------------
  // Expenses by date range (+ optional category / account filter)
  // ---------------------------------------------------------------------------
  queryExpensesByDateRange: tool({
    description:
      "Get expense transactions within a date range with the total amount. Use for any numeric / date-range expense question (e.g. 'how much did I spend in March', 'total food expenses last week'). Pass categoryName or accountName as strings — the server looks them up. Always prefer this over semantic search for numbers.",
    inputSchema: z.object({
      startDate: dateString,
      endDate: dateString,
      categoryId: z.number().optional(),
      categoryName: z.string().optional(),
      accountId: z.number().optional(),
      accountName: z.string().optional(),
    }),
    execute: async ({ startDate, endDate, categoryId, categoryName, accountId, accountName }) => {
      console.log("[tool:queryExpensesByDateRange]", { startDate, endDate, categoryId, categoryName, accountId, accountName });

      // Lookup categoryId from name if needed
      if (categoryName && !categoryId) {
        const { data: cat } = await supabase
          .from("Expense_category")
          .select("id")
          .eq("profile_id", profile_id)
          .ilike("category_name", categoryName)
          .maybeSingle();
        if (cat) {
          categoryId = cat.id;
        } else {
          return `Category "${categoryName}" not found. Please check the spelling.`;
        }
      }

      // Lookup accountId from name if needed
      if (accountName && !accountId) {
        const { data: acc } = await supabase
          .from("account")
          .select("id")
          .eq("profile_id", profile_id)
          .ilike("account_name", accountName)
          .maybeSingle();
        if (acc) {
          accountId = acc.id;
        } else {
          return `Account "${accountName}" not found. Please check the spelling.`;
        }
      }

      // Pad to full timestamps so same-day transactions aren't excluded
      const start = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`;
      const end = endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;

      let query = supabase
        .from("Expense")
        .select(
          "id, amount, description, transaction_date, expense_categoryid, account_id, Expense_category(category_name), account(account_name)",
        )
        .eq("profile_id", profile_id)
        .gte("transaction_date", start)
        .lte("transaction_date", end)
        .order("transaction_date", { ascending: false });

      if (categoryId !== undefined) query = query.eq("expense_categoryid", categoryId);
      if (accountId !== undefined) query = query.eq("account_id", accountId);

      const { data, error } = await query;
      if (error) {
        console.error("queryExpensesByDateRange error:", error);
        return `Query failed: ${error.message}`;
      }

      const rows = data ?? [];
      const total = rows.reduce((sum, r: any) => sum + Number(r.amount ?? 0), 0);

      return {
        count: rows.length,
        total: Number(total.toFixed(2)),
        startDate,
        endDate,
        transactions: rows.map((r: any) => ({
          amount: r.amount,
          description: r.description,
          transaction_date: r.transaction_date,
          category: r.Expense_category?.category_name ?? null,
          account: r.account?.account_name ?? null,
        })),
      };
    },
  }),

  // ---------------------------------------------------------------------------
  // Incomes by date range
  // ---------------------------------------------------------------------------
  queryIncomesByDateRange: tool({
    description:
      "Get income transactions within a date range with the total amount. Use for any numeric / date-range income question (e.g. 'how much did I earn last month', 'total freelance income this year'). Pass categoryName or accountName as strings — the server looks them up. Always prefer this over semantic search for numbers.",
    inputSchema: z.object({
      startDate: dateString,
      endDate: dateString,
      categoryId: z.number().optional(),
      categoryName: z.string().optional(),
      accountId: z.number().optional(),
      accountName: z.string().optional(),
    }),
    execute: async ({ startDate, endDate, categoryId, categoryName, accountId, accountName }) => {
      console.log("[tool:queryIncomesByDateRange]", { startDate, endDate, categoryId, categoryName, accountId, accountName });

      // Lookup categoryId from name if needed
      if (categoryName && !categoryId) {
        const { data: cat } = await supabase
          .from("Income_category")
          .select("id")
          .eq("profile_id", profile_id)
          .ilike("category_name", categoryName)
          .maybeSingle();
        if (cat) {
          categoryId = cat.id;
        } else {
          return `Category "${categoryName}" not found. Please check the spelling.`;
        }
      }

      // Lookup accountId from name if needed
      if (accountName && !accountId) {
        const { data: acc } = await supabase
          .from("account")
          .select("id")
          .eq("profile_id", profile_id)
          .ilike("account_name", accountName)
          .maybeSingle();
        if (acc) {
          accountId = acc.id;
        } else {
          return `Account "${accountName}" not found. Please check the spelling.`;
        }
      }

      // Pad to full timestamps so same-day transactions aren't excluded
      const start = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`;
      const end = endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;

      let query = supabase
        .from("Income")
        .select(
          "id, amount, source_description, created_at, income_categoryid, account_id, Income_category(category_name), account(account_name)",
        )
        .eq("profile_id", profile_id)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      if (categoryId !== undefined) query = query.eq("income_categoryid", categoryId);
      if (accountId !== undefined) query = query.eq("account_id", accountId);

      const { data, error } = await query;
      if (error) {
        console.error("queryIncomesByDateRange error:", error);
        return `Query failed: ${error.message}`;
      }

      const rows = data ?? [];
      const total = rows.reduce((sum, r: any) => sum + Number(r.amount ?? 0), 0);

      return {
        count: rows.length,
        total: Number(total.toFixed(2)),
        startDate,
        endDate,
        transactions: rows.map((r: any) => ({
          amount: r.amount,
          source_description: r.source_description,
          date: r.created_at,
          category: r.Income_category?.category_name ?? null,
          account: r.account?.account_name ?? null,
        })),
      };
    },
  }),

  // ---------------------------------------------------------------------------
  // Sum grouped by category
  // ---------------------------------------------------------------------------
  getCategoryTotals: tool({
    description:
      "Get totals grouped by category for either expenses or income within a date range. Use for breakdown / comparison questions (e.g. 'what categories did I spend the most on last month').",
    inputSchema: z.object({
      kind: z.enum(["expense", "income"]),
      startDate: dateString,
      endDate: dateString,
    }),
    execute: async ({ kind, startDate, endDate }) => {
      console.log("[tool:getCategoryTotals]", { kind, startDate, endDate });

      const isExpense = kind === "expense";
      const table = isExpense ? "Expense" : "Income";
      const dateCol = isExpense ? "transaction_date" : "created_at";
      const catFkCol = isExpense ? "expense_categoryid" : "income_categoryid";
      const catTable = isExpense ? "Expense_category" : "Income_category";

      // Pad to full timestamps so same-day transactions aren't excluded
      const start = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`;
      const end = endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from(table)
        .select(`amount, ${catFkCol}, ${catTable}(category_name)`)
        .eq("profile_id", profile_id)
        .gte(dateCol, start)
        .lte(dateCol, end);

      if (error) {
        console.error("getCategoryTotals error:", error);
        return `Query failed: ${error.message}`;
      }

      const totals = new Map<string, { category: string; total: number; count: number }>();
      for (const row of (data ?? []) as any[]) {
        const name: string = row[catTable]?.category_name ?? "Uncategorized";
        const existing = totals.get(name) ?? { category: name, total: 0, count: 0 };
        existing.total += Number(row.amount ?? 0);
        existing.count += 1;
        totals.set(name, existing);
      }

      const breakdown = Array.from(totals.values())
        .map((t) => ({ ...t, total: Number(t.total.toFixed(2)) }))
        .sort((a, b) => b.total - a.total);

      const grandTotal = breakdown.reduce((s, t) => s + t.total, 0);

      return {
        kind,
        startDate,
        endDate,
        grandTotal: Number(grandTotal.toFixed(2)),
        breakdown,
      };
    },
  }),

  // ---------------------------------------------------------------------------
  // Net change (income minus expenses) over a period
  // ---------------------------------------------------------------------------
  getNetChange: tool({
    description:
      "Calculate net change (total income minus total expenses) for a date range. Use for questions like 'how much did I make/save this month', 'what was my net change last month', or any comparison of income vs spending over time.",
    inputSchema: z.object({
      startDate: dateString,
      endDate: dateString,
      accountId: z.number().optional(),
      accountName: z.string().optional(),
    }),
    execute: async ({ startDate, endDate, accountId, accountName }) => {
      console.log("[tool:getNetChange]", { startDate, endDate, accountId, accountName });

      // Lookup accountId from name if needed
      if (accountName && !accountId) {
        const { data: acc } = await supabase
          .from("account")
          .select("id")
          .eq("profile_id", profile_id)
          .ilike("account_name", accountName)
          .maybeSingle();
        if (acc) {
          accountId = acc.id;
        } else {
          return `Account "${accountName}" not found. Please check the spelling.`;
        }
      }

      const start = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`;
      const end = endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;

      // Query income
      let incomeQuery = supabase
        .from("Income")
        .select("amount")
        .eq("profile_id", profile_id)
        .gte("created_at", start)
        .lte("created_at", end);
      if (accountId !== undefined) incomeQuery = incomeQuery.eq("account_id", accountId);

      // Query expenses
      let expenseQuery = supabase
        .from("Expense")
        .select("amount")
        .eq("profile_id", profile_id)
        .gte("transaction_date", start)
        .lte("transaction_date", end);
      if (accountId !== undefined) expenseQuery = expenseQuery.eq("account_id", accountId);

      const [{ data: incomeData, error: incomeErr }, { data: expenseData, error: expenseErr }] =
        await Promise.all([incomeQuery, expenseQuery]);

      if (incomeErr) return `Income query failed: ${incomeErr.message}`;
      if (expenseErr) return `Expense query failed: ${expenseErr.message}`;

      const totalIncome = (incomeData ?? []).reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
      const totalExpenses = (expenseData ?? []).reduce((s, r: any) => s + Number(r.amount ?? 0), 0);
      const netChange = totalIncome - totalExpenses;

      return {
        startDate,
        endDate,
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netChange: Number(netChange.toFixed(2)),
        summary: netChange >= 0
          ? `You were up $${netChange.toFixed(2)} (earned more than spent)`
          : `You were down $${Math.abs(netChange).toFixed(2)} (spent more than earned)`,
      };
    },
  }),

  // ---------------------------------------------------------------------------
  // Current balance per account
  // ---------------------------------------------------------------------------
  getAccountBalanceSummary: tool({
    description:
      "Get current balance for every account, plus net worth totals. Use for 'what's my balance' / 'net worth' / 'how much do I have' questions.",
    inputSchema: z.object({}),
    execute: async () => {
      console.log("[tool:getAccountBalanceSummary]");

      const { data, error } = await supabase
        .from("account")
        .select("id, account_name, account_type, balance, currency")
        .eq("profile_id", profile_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("getAccountBalanceSummary error:", error);
        return `Query failed: ${error.message}`;
      }

      const accounts = (data ?? []).map((a: any) => ({
        name: a.account_name,
        type: a.account_type,
        balance: Number(a.balance ?? 0),
        currency: a.currency,
      }));

      // Credit accounts represent debt — subtract from net worth
      const assets = accounts
        .filter((a) => a.type !== "credit")
        .reduce((s, a) => s + a.balance, 0);
      const liabilities = accounts
        .filter((a) => a.type === "credit")
        .reduce((s, a) => s + a.balance, 0);

      return {
        accounts,
        totals: {
          assets: Number(assets.toFixed(2)),
          liabilities: Number(liabilities.toFixed(2)),
          netWorth: Number((assets - liabilities).toFixed(2)),
        },
      };
    },
  }),
});
