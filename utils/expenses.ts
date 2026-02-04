import { supabase } from "./supabase";

export type ExpenseInsert = {
  profile_id: string;
  account_id: number;
  amount: number;
  description?: string | null;
  is_recurring?: boolean | null;
  reccurence_freq?: string | null;
  next_occurence?: string | null;
  end_date?: string | null;
  expense_categoryid?: number | null;
  subcategory_id?: number | null;
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

  const { error } = await supabase
    .from("Expense")
    .update(update)
    .eq("id", id)
    .eq("profile_id", profile_id);

  if (error) throw error;
  return true;
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
  return data; // data returned will be an array
}
