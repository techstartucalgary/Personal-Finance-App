export type AccountType = "credit" | "debit";

// fields in the accounts table
export type AccountRow = {
  id: string;
  profile_id: string;
  created_at?: string | null;

  account_type: string | null;
  account_name: string | null;

  balance: number | null;
  credit_limit: number | null;

  statement_duedate: string | null;
  payment_duedate: string | null;

  interest_rate: number | null;
  currency: string | null;
};

export type GoalRow = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number | null;
  target_date: string | null;
  linked_account: number | null;
  linked_plaid_account: string | null;
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
