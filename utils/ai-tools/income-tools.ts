import { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";


export const incomeTools = (profile_id: string, supabase: SupabaseClient) => ({
  // Step 1: Gather income details (amount, source_description)
  createIncome: tool({
    description: "Create a new income transaction. Ask user for: amount, source description",
    inputSchema: z.object({
      amount: z.number().positive("Amount must be positive"),
      source_description: z.string().min(1, "Source description is required")
    }),
    execute: async ({ amount, source_description }) => {
      console.log("[tool:createIncome]", { amount, source_description });

      return {
        status: "awaiting_account_selection",
        message: `I'm ready to add: $${amount} from "${source_description}". Please select which account to add this to:`,
        transactionData: { amount, source_description }
      };
    },
  }),


  // Step 2: Get accounts AND income categories for selection
  getAccountsAndIncomeCategoriesForSelection: tool({
    description: "Get list of accounts and income categories. User selects account, AI automatically categorizes based on source description.",
    inputSchema: z.object({}),
    execute: async () => {
      const { data: accountData, error: accountError } = await supabase
        .from("account")
        .select("id, profile_id, created_at, account_name, account_type, balance, currency")
        .eq("profile_id", profile_id)
        .order("created_at", { ascending: false });

      if (accountError || !accountData) {
        return "No accounts found. Please create an account first.";
      }

      const { data: categoryData, error: categoryError } = await supabase
        .from("Income_category")
        .select("id, profile_id, created_at, category_name")
        .eq("profile_id", profile_id)
        .order("created_at", { ascending: false });

      if (categoryError || !categoryData) {
        return "No income categories found. Please create a category first.";
      }

      return {
        accounts: accountData.map(acc => ({
          id: acc.id,
          label: `${acc.account_name} (${acc.account_type}) - Balance: $${acc.balance}`,
          name: acc.account_name,
          type: acc.account_type,
          value: acc.id,
          balance: acc.balance,
        })),
        categories: categoryData.map(cat => ({
          id: cat.id,
          name: cat.category_name,
          label: cat.category_name,
          value: cat.id
        })),
        message: "Please select an account for this transaction."
      };
    },
  }),


  // Step 2b: Get income categories for selection (fallback when AI can't determine category)
  getIncomeCategoriesForSelection: tool({
    description: "Get list of income categories for user to select from when AI cannot automatically determine the best category.",
    inputSchema: z.object({}),
    execute: async () => {
      const { data: categoryData, error: categoryError } = await supabase
        .from("Income_category")
        .select("id, profile_id, created_at, category_name")
        .eq("profile_id", profile_id)
        .order("created_at", { ascending: false });

      if (categoryError || !categoryData) {
        return "No income categories found. Please create a category first.";
      }

      return {
        categories: categoryData.map(cat => ({
          id: cat.id,
          name: cat.category_name,
          label: cat.category_name,
          value: cat.id
        })),
        message: "I'm not sure which category this fits best. Please select one:"
      };
    },
  }),


  // Step 3: Insert income with AI-selected category OR user-selected category
  insertIncome: tool({
    description: "Insert an income transaction. AI should automatically select the best category based on the source description. If unsure, ask user to pick.",
    inputSchema: z.object({
      accountId: z.number().or(z.string()),
      amount: z.number().positive(),
      source_description: z.string(),
      categoryId: z.string().or(z.number()),
      categoryName: z.string(),
      accountName: z.string(),
      accountType: z.string(),
      balance: z.number()
    }),
    execute: async ({ accountId, amount, source_description, categoryId, categoryName, accountName, accountType, balance }) => {
      console.log("[tool:insertIncome]", { accountId, amount, source_description, categoryId, categoryName });

      try {
        const { data, error } = await supabase
          .from("Income")
          .insert({
            profile_id: profile_id,
            account_id: accountId,
            amount: amount,
            source_description: source_description,
            income_categoryid: categoryId,
          })
          .select("*")
          .single();

        if (error) {
          console.error("Insert error:", error);
          return `Failed to insert transaction: ${error.message}`;
        }

        // Income increases balance for regular accounts, decreases for credit (reduces what you owe)
        const isCredit = accountType === "credit";
        const newBalance = isCredit ? balance - amount : balance + amount;

        const { error: updateError } = await supabase
          .from("account")
          .update({ balance: newBalance })
          .eq("id", accountId)
          .eq("profile_id", profile_id);

        if (updateError) {
          console.error("Balance update error:", updateError);
          return `Transaction inserted but failed to update balance: ${updateError.message}`;
        }

        console.log("[tool:insertIncome] Balance updated successfully", { accountId, newBalance });

        return {
          success: true,
          message: `✅ Income added successfully!`,
          details: {
            amount: `$${amount}`,
            source_description,
            account: accountName,
            category: categoryName,
            oldBalance: `$${balance}`,
            newBalance: `$${newBalance}`
          }
        };
      } catch (err) {
        console.error("Error inserting income:", err);
        return "An error occurred while inserting the transaction.";
      }
    },
  }),


});
