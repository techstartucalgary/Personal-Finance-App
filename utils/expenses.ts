import { supabase } from "./supabase";

export type ExpenseInsert = {
  profile_id: string;
  account_id: number;
  amount: number;
  description?: string | null;
  recurring_rule_id?: number;
  expense_categoryid?: number | null;
  subcategory_id?: number | null;
  transaction_date?: string;
};

export type ExpenseUpdate = Partial<Omit<ExpenseInsert, "profile_id">>;

export async function addExpense(expense: ExpenseInsert) {
  const { data, error } = await supabase
    .from("Expense")
    .insert(expense)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateExpense(params: {
  id: string;
  profile_id: string;
  update: ExpenseUpdate;
}) {
  const { id, profile_id, update } = params;

  const { data, error } = await supabase
    .from("Expense")
    .update(update)
    .eq("id", id)
    .eq("profile_id", profile_id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(params: {
  id: string;
  profile_id: string;
}) {
  const { id, profile_id } = params;

  const { error } = await supabase
    .from("Expense")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile_id);

  if (error) throw error;
  return true;
}

export async function getExpense(params: { id: string; profile_id: string }) {
  const { id, profile_id } = params;

  const { data, error } = await supabase
    .from("Expense")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profile_id)
    .single();

  if (error) throw error;
  return data;
}

export async function listExpenses(params: { profile_id: string }) {
  const { profile_id } = params;

  const { data, error } = await supabase
    .from("Expense")
    .select("*")
    .eq("profile_id", profile_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;  // data returned will be an array
}



export async function hasRecurringExpense(params: {
  profile_id: string;
  recurring_rule_id: string | number;
  transaction_date: string; 
}) {
  const { profile_id, recurring_rule_id, transaction_date } = params;

  const { data, error } = await supabase
    .from("Expense")
    .select("id")
    .eq("profile_id", profile_id)
    .eq("recurring_rule_id", recurring_rule_id)
    .eq("transaction_date", transaction_date)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
