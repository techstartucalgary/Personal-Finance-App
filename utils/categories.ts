import { supabase } from "./supabase";

export type CategoryRow = {
  id: number;
  category_name: string | null;
  profile_id: string;
  created_at?: string | null;
};

export type SubcategoryRow = {
  id: number;
  category_name: string | null;
  expense_categoryid: number | null;
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

export async function listSubcategories(params: {
  profile_id: string;
  category_id: number;
}) {
  const { profile_id, category_id } = params;

  const { data, error } = await supabase
    .from("SubExpense_category")
    .select(
      "id, category_name, expense_categoryid, profile_id, created_at",
    )
    .eq("profile_id", profile_id)
    .eq("expense_categoryid", category_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as SubcategoryRow[];
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

export async function addSubcategory(params: {
  profile_id: string;
  category_id: number;
  category_name: string;
}) {
  const { profile_id, category_id, category_name } = params;

  const { data, error } = await supabase
    .from("SubExpense_category")
    .insert({
      profile_id,
      expense_categoryid: category_id,
      category_name,
    })
    .select(
      "id, category_name, expense_categoryid, profile_id, created_at",
    )
    .single();

  if (error) throw error;
  return data as SubcategoryRow;
}

export async function deleteCategory(params: {
  id: number;
  profile_id: string;
}) {
  const { id, profile_id } = params;

  // 1. Unlink expenses (set category and subcategory to null)
  const { error: unlinkError } = await supabase
    .from("Expense")
    .update({ expense_categoryid: null, subcategory_id: null })
    .eq("expense_categoryid", id)
    .eq("profile_id", profile_id);

  if (unlinkError) throw unlinkError;

  // 2. Delete subcategories
  const { error: subError } = await supabase
    .from("SubExpense_category")
    .delete()
    .eq("expense_categoryid", id)
    .eq("profile_id", profile_id);

  if (subError) throw subError;

  // 3. Delete the category itself
  const { error } = await supabase
    .from("Expense_category")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile_id);

  if (error) throw error;
  return true;
}

export async function deleteSubcategory(params: {
  id: number;
  profile_id: string;
}) {
  const { id, profile_id } = params;

  // 1. Unlink expenses
  const { error: unlinkError } = await supabase
    .from("Expense")
    .update({ subcategory_id: null })
    .eq("subcategory_id", id)
    .eq("profile_id", profile_id);

  if (unlinkError) throw unlinkError;

  // 2. Delete subcategory
  const { error } = await supabase
    .from("SubExpense_category")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile_id);

  if (error) throw error;
  return true;
}
