import { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";


export const expenseTools = (profile_id: string, supabase: SupabaseClient) => ({
    // Step 1: Get accounts AND categories for selection
    getAccountsAndCategoriesForSelection: tool({
      description: "Get list of accounts and expense categories for the account selection step. The user ALWAYS picks the category — never auto-assign or skip the category picker.",
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


    // Renders a UI prompt asking the user to confirm or edit a category name.
    // Stream halts on this call (see stopWhen in /api/chat). No DB write here.
    requestNewExpenseCategoryName: tool({
      description: "Render a UI prompt asking the user to confirm or edit a name for a new expense category. Use ONLY when the user has zero expense categories. Pass a sensible suggestion derived from the transaction description. Do NOT call createExpenseCategory or insertExpense in the same turn — the stream halts after this call and the user must respond first.",
      inputSchema: z.object({
        description: z.string(),
        suggestion: z.string().min(1).max(50),
      }),
      execute: async ({ description, suggestion }) => {
        return {
          description,
          suggestion,
          message: "You don't have any expense categories yet. Confirm or edit a name for your first one:",
        };
      },
    }),


    // Create a new expense category. Use only when the user has 0 expense categories
    // and has provided a name in the conversation (or accepted a suggested one).
    createExpenseCategory: tool({
      description: "Create a new expense category for the user with the provided name. Use only after the user has confirmed or provided a name in the conversation.",
      inputSchema: z.object({
        category_name: z.string().min(1).max(50),
      }),
      execute: async ({ category_name }) => {
        const trimmed = category_name.trim();
        if (!trimmed) {
          return "Category name cannot be empty.";
        }

        // Prevent duplicates (case-insensitive)
        const { data: existing } = await supabase
          .from("Expense_category")
          .select("id, category_name")
          .eq("profile_id", profile_id)
          .ilike("category_name", trimmed);

        if (existing && existing.length > 0) {
          return {
            success: false,
            message: `A category named '${existing[0].category_name}' already exists. Use that one instead of creating a duplicate.`,
            categoryId: existing[0].id,
            categoryName: existing[0].category_name,
          };
        }

        const { data, error } = await supabase
          .from("Expense_category")
          .insert({
            profile_id: profile_id,
            category_name: trimmed,
          })
          .select("id, category_name")
          .single();

        if (error || !data) {
          console.error("[tool:createExpenseCategory] Insert error:", error);
          return `Failed to create category: ${error?.message || "unknown error"}`;
        }

        console.log("[tool:createExpenseCategory] Created", { id: data.id, name: data.category_name });

        return {
          success: true,
          categoryId: data.id,
          categoryName: data.category_name,
          message: `Category '${data.category_name}' created!`,
        };
      },
    }),


      // Step 1b: Get categories for selection (fallback when AI can't determine category)
  getExpenseCategoriesForSelection: tool({
    description: "Show the expense category picker so the user selects the category. ALWAYS call this after account selection — never skip it, never auto-pick a category on the user's behalf.",
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
  
    // Step 2: Insert expense with AI-selected category OR user-selected category
  insertExpense: tool({
    description: "Insert an expense transaction. Pass accountId and categoryId chosen by the user from getAccountsAndCategoriesForSelection / getExpenseCategoriesForSelection. The server validates IDs and looks up names/balance — do not pass them.",
    inputSchema: z.object({
      accountId: z.number().or(z.string()),
      amount: z.number().positive(),
      description: z.string(),
      categoryId: z.string().or(z.number()),
    }),
    execute: async ({ accountId, amount, description, categoryId }) => {
      console.log("[tool:insertExpense]", { accountId, amount, description, categoryId });

      // Validate account belongs to user
      const { data: account, error: accountError } = await supabase
        .from("account")
        .select("id, account_name, account_type, balance")
        .eq("profile_id", profile_id)
        .eq("id", accountId)
        .maybeSingle();

      if (accountError || !account) {
        console.error("[tool:insertExpense] Invalid accountId", { accountId, accountError });
        return "The provided accountId is not valid for this user. Call getAccountsAndCategoriesForSelection again and use one of the returned account IDs.";
      }

      // Validate category belongs to user
      const { data: category, error: categoryError } = await supabase
        .from("Expense_category")
        .select("id, category_name")
        .eq("profile_id", profile_id)
        .eq("id", categoryId)
        .maybeSingle();

      if (categoryError || !category) {
        console.error("[tool:insertExpense] Invalid categoryId", { categoryId, categoryError });
        return "The provided categoryId is not valid for this user. Call getExpenseCategoriesForSelection and use one of the returned category IDs.";
      }

      try {
        const { error } = await supabase
          .from("Expense")
          .insert({
            profile_id: profile_id,
            account_id: account.id,
            amount: amount,
            description: description,
            recurring_rule_id: null,
            expense_categoryid: category.id,
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
        const isCredit = account.account_type === "credit";
        const newBalance = isCredit ? account.balance + amount : account.balance - amount;

        const { error: updateError } = await supabase
          .from("account")
          .update({ balance: newBalance })
          .eq("id", account.id)
          .eq("profile_id", profile_id);

        if (updateError) {
          console.error("Balance update error:", updateError);
          return `Transaction inserted but failed to update balance: ${updateError.message}`;
        }

        console.log("[tool:insertExpense] Balance updated successfully", { accountId: account.id, newBalance });

        return {
          success: true,
          message: `✅ Expense added successfully!`,
          details: {
            amount: `$${amount}`,
            description,
            account: account.account_name,
            category: category.category_name,
            oldBalance: `$${account.balance}`,
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