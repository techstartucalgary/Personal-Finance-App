import { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";


export const allAccounts = (profile_id: string, supabase: SupabaseClient) => tool({
  description: "List of all accounts for the user.",
  inputSchema: z.object({}),
  execute: async () => {
    console.log("Profile ID: ", profile_id)
    try {
      const { data, error } = await supabase
        .from("account")
        .select("id, profile_id, created_at, account_name, account_type, balance, currency")
        .eq("profile_id", profile_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        return "Failed to fetch accounts.";
      }

      console.log("Found accounts:", data);
      console.log("Number of accounts:", data?.length || 0);

      if (!data || data.length === 0) {
        return "The user has no accounts.";
      }

      const accountNames = data.map(acc => acc.account_name).filter(Boolean);
      return `The user's accounts are: ${accountNames.join(', ')}.`;
      // return data as AccountRow[];
    }catch (err) {
      console.error("Error in allAccounts tool:", err);
      return "An error occurred while fetching accounts.";
    }
  },
})