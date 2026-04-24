import { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";


export const expenseTools = (profile_id: string, supabase: SupabaseClient) => ({
  // Step 1: Gather expense details (amount, description)
  createExpense: tool({
    description: "Create a new expense transaction. Ask user for: amount, description",
    inputSchema: z.object({
      amount: z.number().positive("Amount must be positive"),
      description: z.string().min(1, "Description is required")
    }),
    execute: async ({ amount, description }) => {
      console.log("[tool:createExpense]", { amount, description });
      
      // Return a message asking user to select an account
      return {
        status: "awaiting_account_selection",
        message: `I'm ready to add: $${amount} for "${description}". Please select which account to add this to:`,
        transactionData: { amount, description }
      };
    },
  }),


    // Step 2: Get accounts AND categories for selection
    getAccountsAndCategoriesForSelection: tool({
      description: "Get list of accounts and expense categories. User selects account, AI automatically categorizes based on description.",
      inputSchema: z.object({}),
      execute: async () => {
        // Fetch accounts
        const { data: accountData, error: accountError } = await supabase
          .from("account")
          .select("id, profile_id, created_at, account_name, account_type, balance, currency")
          .eq("profile_id", profile_id)
          .order("created_at", { ascending: false });
  
        if (accountError || !accountData) {
          return "No accounts found. Please create an account first.";
        }
  
        // Fetch categories
        const { data: categoryData, error: categoryError } = await supabase
          .from("Expense_category")
          .select("id, profile_id, created_at, category_name")
          .eq("profile_id", profile_id)
          .order("created_at", { ascending: false });
  
        if (categoryError || !categoryData) {
          return "No expense categories found. Please create a category first.";
        }
  
        // Return both accounts and categories
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


      // Step 2b: Get categories for selection (fallback when AI can't determine category)
  getExpenseCategoriesForSelection: tool({
    description: "Get list of expense categories for user to select from when AI cannot automatically determine the best category.",
    inputSchema: z.object({}),
    execute: async () => {
      const { data: categoryData, error: categoryError } = await supabase
        .from("Expense_category")
        .select("id, profile_id, created_at, category_name")
        .eq("profile_id", profile_id)
        .order("created_at", { ascending: false });

      if (categoryError || !categoryData) {
        return "No expense categories found. Please create a category first.";
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
  
    // Step 3: Insert expense with AI-selected category OR user-selected category
  insertExpense: tool({
    description: "Insert an expense transaction. AI should automatically select the best category based on the expense description. If unsure, ask user to pick.",
    inputSchema: z.object({
      accountId: z.number().or(z.string()),
      amount: z.number().positive(),
      description: z.string(),
      categoryId: z.string().or(z.number()),
      categoryName: z.string(),
      accountName: z.string(),
      accountType: z.string(),
      balance: z.number()
    }),
    execute: async ({ accountId, amount, description, categoryId, categoryName, accountName, accountType, balance }) => {
      console.log("[tool:insertExpense]", { accountId, amount, description, categoryId, categoryName });

      try {
        const { data, error } = await supabase
          .from("Expense")
          .insert({
            profile_id: profile_id,
            account_id: accountId,
            amount: amount,
            description: description,
            recurring_rule_id: null,
            expense_categoryid: categoryId,
            subcategory_id: null,
            transaction_date: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (error) {
          console.error("Insert error:", error);
          return `Failed to insert transaction: ${error.message}`;
        }

        // Update account balance
        const isCredit = accountType === "credit";
        const newBalance = isCredit ? balance + amount : balance - amount;

        const { error: updateError } = await supabase
          .from("account")
          .update({ balance: newBalance })
          .eq("id", accountId)
          .eq("profile_id", profile_id);

        if (updateError) {
          console.error("Balance update error:", updateError);
          return `Transaction inserted but failed to update balance: ${updateError.message}`;
        }

        console.log("[tool:insertExpense] Balance updated successfully", { accountId, newBalance });

        return {
          success: true,
          message: `✅ Expense added successfully!`,
          details: {
            amount: `$${amount}`,
            description,
            account: accountName,
            category: categoryName,
            oldBalance: `$${balance}`,
            newBalance: `$${newBalance}`
          }
        };
      } catch (err) {
        console.error("Error inserting expense:", err);
        return "An error occurred while inserting the transaction.";
      }
      },
    }),


});