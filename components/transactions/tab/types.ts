// Shared types for the Transactions tab and its child components.
export type TransactionsUi = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  mutedText: string;
  backdrop: string;
  accent: string;
  accentSoft: string;
  danger: string;
  positive: string;
  negative: string;
};

export type TransactionsTab = "transactions" | "recurrences";

export type FilterAccountId = string | number | null;

export type AccountRow = {
  id: number;
  account_name: string | null;
  account_type: string | null;
  balance: number | null;
  currency: string | null;
};

export type CategoryRow = {
  id: number;
  category_name: string | null;
};

export type SubcategoryRow = {
  id: number;
  category_name: string | null;
  expense_categoryid: number | null;
};

export type ExpenseRow = {
  id: string;
  amount: number | null;
  description?: string | null;
  created_at?: string | null;
  account_id?: number | null;
  expense_categoryid?: number | null;
  subcategory_id?: number | null;
  transaction_date?: string | null;
  recurring_rule_id?: number | null;
};

export type RecurringRule = {
  id: number;
  name?: string | null;
  amount?: number | null;
  frequency?: string | null;
  end_date?: string | null;
  next_run_date?: string | null;
  expense_categoryid?: number | null;
  subcategory_id?: number | null;
  is_active?: boolean | null;
  account_id?: number | null;
};
