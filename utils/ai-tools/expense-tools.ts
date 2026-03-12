import { addExpense } from "@/utils/expenses";
import { tool } from "ai";
import { z } from "zod";

export const createExpenseTools = (profile_id: string) => ({
  addExpense: tool({
    description: "Create an expense transaction for the user",
    inputSchema: z.object({
      account_id: z.number(),
      amount: z.number(),
      description: z.string().nullable().optional(),
      recurring_rule_id: z.number().nullable().optional(),
      transaction_date: z.string(),
      expense_categoryid: z.number().nullable().optional(),
      subcategory_id: z.number().nullable().optional(),
    }),
    execute: async (args) => {
      const newExpense = await addExpense({
        profile_id,
        account_id: args.account_id,
        amount: args.amount,
        description: args.description ?? null,
        transaction_date: args.transaction_date,
        expense_categoryid: args.expense_categoryid ?? null,
        subcategory_id: args.subcategory_id ?? null,
      });

      return {newExpense};
    },
  }),
});
