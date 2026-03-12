import { listAccounts } from "@/utils/accounts";
import { tool } from "ai";
import { z } from "zod";


export const allAccounts = (profile_id: string) => tool({
  description: "List of all accounts for the user.",
  inputSchema: z.object({}),
  execute: async () => {
    console.log(profile_id)
    const accounts = await listAccounts({ profile_id: profile_id });
    console.log('Found accounts:', accounts);
    console.log('Number of accounts:', accounts.length);
    const accountNames = accounts.map(acc => acc.account_name).filter(Boolean);
    
    return `The user's accounts are: ${accountNames.join(', ')}.`;
  },
})