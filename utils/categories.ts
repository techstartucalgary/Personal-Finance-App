import { supabase } from "./supabase";

export type CategoryRow = {
  id: number;
  category_name: string | null;
  profile_id: string;
  created_at?: string | null;
};

export async function listCategories(params: { profile_id: string }) {
  const { profile_id } = params;

  const { data, error } = await supabase
    .from("Expense_category")
    .select("id, category_name, profile_id, created_at")
    .eq("profile_id", profile_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as CategoryRow[];
}

export async function addCategory(params: {
  profile_id: string;
  category_name: string;
}) {
  const { profile_id, category_name } = params;

  const { data, error } = await supabase
    .from("Expense_category")
    .insert({ profile_id, category_name })
    .select("id, category_name, profile_id, created_at")
    .single();

  if (error) throw error;
  return data as CategoryRow;
}
