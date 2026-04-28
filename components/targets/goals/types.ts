import type { ExpenseRow, RecurringRule } from "@/components/transactions/tab/types";
import type { TabsUi } from "@/constants/tabsTheme";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";

export type GoalRow = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number | null;
  target_date: string | null;
  linked_account: number | null;
  linked_plaid_account: string | null;
  created_at?: string | null;
};

export type GoalSegment = "activity" | "active" | "reached";

export type GoalActivityItem = {
  id: string;
  goalId: string;
  name: string;
  amount: number;
  date: string | null;
  direction: "in" | "out";
};

export type GoalSelectableAccount = {
  id: string | number;
  isPlaid: boolean;
  name: string;
  type: string | null;
  balance: number | null;
  institutionName?: string | null;
  mask?: string | null;
};

export type GoalTransactionsData = {
  expenses: ExpenseRow[];
  plaidTransactions: PlaidTransaction[];
  recurringRules: RecurringRule[];
};

export type GoalAccountCollections = {
  accounts: Array<{
    id: number;
    account_name: string | null;
    account_type: string | null;
    balance: number | null;
    currency: string | null;
  }>;
  plaidAccounts: PlaidAccount[];
};

export type GoalsUi = TabsUi;
