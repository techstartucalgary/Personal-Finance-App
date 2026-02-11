
import { supabase } from "./supabase";

export type BudgetInsert = {
  profile_id: string;
  budget_name: string;
  total_amount: number;
  start_date: string;
  end_date: string;
};

export type BudgetUpdate = Partial<Omit<BudgetInsert, "profile_id">>;

export async function createBudget(input: BudgetInsert) {
  const { data, error } = await supabase
    .from("Budget")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function editBudget(params: {
  id: string | number;
  profile_id: string;
  update: BudgetUpdate;
}) {
  const { id, profile_id, update } = params;

  const { data, error } = await supabase
    .from("Budget")
    .update(update)
    .eq("id", id)
    .eq("profile_id", profile_id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBudget(params: {
  id: string | number;
  profile_id: string;
}) {
  const { id, profile_id } = params;

  const { error } = await supabase
    .from("Budget")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile_id);

  if (error) throw error;
  return true;
}

export async function getBudget(params: { id: string; profile_id: string }) {
  const { id, profile_id } = params;

  const { data, error } = await supabase
    .from("Budget")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profile_id)
    .single();

  if (error) throw error;
  return data;
}

export async function listBudgets(params: { profile_id: string }) {
  const { profile_id } = params;

  const { data, error } = await supabase
    .from("Budget")
    .select("*")
    .eq("profile_id", profile_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data; // data will be an array
}
