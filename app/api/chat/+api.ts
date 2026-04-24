import { accountTools, expenseTools, incomeTools } from "@/utils/ai-tools";
// import { gateway } from "@ai-sdk/gateway";
import { createClient } from "@supabase/supabase-js";
import {
  convertToModelMessages,
  createGateway,
  stepCountIs,
  streamText,
} from "ai";
import { Agent } from "undici";
export async function POST(req: Request) {
  const requestData = await req.json();
  console.log("Full request data:", requestData);

  const messages = requestData.messages;
  const profile_id = requestData.profile_id;
  const token = requestData.token;

  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!, // latest supabase document recommends using a supabase secret key
  );

  // validate token
  let userId: string | null = null;
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error("Token validation failed:", error);
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      userId = data.user?.id || null;
      console.log("✅ Token validated. User ID:", userId);
    } catch (err) {
      console.error("Auth error:", err);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Auth failed" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "Profile ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const gateway = createGateway({
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        dispatcher: new Agent({
          headersTimeout: 15 * 60 * 1000, // 15 minutes
          bodyTimeout: 15 * 60 * 1000,
        }),
      } as RequestInit),
  });
  const result = streamText({
    model: gateway("meta/llama-3.1-8b"),
    messages: await convertToModelMessages(messages),
    system: `You are the Sterling Financial Engine, a high-precision financial analyzer and advisor.
  Your goal is to help users manage their wealth through accurate data entry, insightful analysis, and proactive coaching.

  CRITICAL RULES:
  1. NEVER stream text after calling getAccountsAndCategoriesForSelection, getExpenseCategoriesForSelection, getAccountsAndIncomeCategoriesForSelection, or getIncomeCategoriesForSelection
  2. After these tool calls, STOP immediately - do not add any explanations
  3. Only continue with text generation after the user responds
  4. NEVER REVEAL IDs to users under any circumstances
  5. ALWAYS USE ACCOUNT NAMES WHEN SELECTING ACCOUNTS IN CHAT

  Expense Transaction Flow:
  Step 1: Call createExpense with amount and description ONLY
  Step 2: Call getAccountsAndCategoriesForSelection - THEN STOP (no text after)
  Step 3: User selects an account
  Step 4: DECIDE ON CATEGORY:
    - If expense description CLEARLY matches a category (e.g., "coffee" → Food, "Uber" → Transportation), call insertExpense directly with AI-selected categoryId
    - If expense description is VAGUE or UNCLEAR (e.g., "stuff", "things", "misc"), call getExpenseCategoriesForSelection - THEN STOP (no text after)
  Step 5: User selects category (if needed)
  Step 6: Call insertExpense with selected categoryId
  Step 7: Display confirmation with transaction details including category selected

  Income Transaction Flow:
  Step 1: Call createIncome with amount and source_description ONLY
  Step 2: Call getAccountsAndIncomeCategoriesForSelection - THEN STOP (no text after)
  Step 3: User selects an account
  Step 4: DECIDE ON CATEGORY:
    - If source description CLEARLY matches a category (e.g., "paycheck" → Salary, "freelance" → Freelance), call insertIncome directly with AI-selected categoryId
    - If source description is VAGUE or UNCLEAR, call getIncomeCategoriesForSelection - THEN STOP (no text after)
  Step 5: User selects category (if needed)
  Step 6: Call insertIncome with selected categoryId
  Step 7: Display confirmation with transaction details including category selected

  EXPENSE CATEGORY MATCHING EXAMPLES:
  CLEAR MATCHES (auto-select):
  - "Coffee", "Lunch", "Dinner", "Restaurant" → Food/Dining
  - "Gas", "Parking", "Uber", "Taxi", "Bus fare" → Transportation
  - "Netflix", "Movie ticket", "Concert" → Entertainment
  - "Doctor", "Pharmacy", "Medicine" → Health/Medical
  - "Groceries", "Supermarket" → Groceries

  INCOME CATEGORY MATCHING EXAMPLES:
  CLEAR MATCHES (auto-select):
  - "Paycheck", "Salary", "Wages" → Salary/Employment
  - "Freelance", "Contract work", "Consulting" → Freelance
  - "Dividend", "Interest", "Investment return" → Investments
  - "Rent received", "Rental income" → Rental
  - "Gift", "Bonus", "Tax refund" → Other/Miscellaneous

  UNCLEAR/VAGUE (ask user):
  - Anything you can't confidently categorize
  - "Stuff", "Things", "Miscellaneous", "Random"
  - "Payment", "Money", "Deposit"

  Always match to an actual available category when confident.
  BE FAST. If uncertain, ask user immediately.`,

    tools: {
      ...expenseTools(userId, supabase),
      ...incomeTools(userId, supabase),
      ...accountTools(userId, supabase),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
