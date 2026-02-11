import { supabase } from "./supabase";

export type GoalInsert = {
  profile_id: string;
  name: string;
  target_amount: number;
  current_amount?: number | null;
  target_date?: string | null;
  linked_account?: number | null;
};

export type GoalUpdate = Partial<Omit<GoalInsert, "profile_id">>;

export async function createGoal(input: GoalInsert) {
  const { data, error } = await supabase
    .from("Goal")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function editGoal(params: {
  id: string | number;
  profile_id: string;
  update: GoalUpdate;
}) {
  const { id, profile_id, update } = params;

  const { data, error } = await supabase
    .from("Goal")
    .update(update)
    .eq("id", id)
    .eq("profile_id", profile_id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGoal(params: {
  id: string | number;
  profile_id: string;
}) {
  const { id, profile_id } = params;

  const { error } = await supabase
    .from("Goal")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile_id);

  if (error) throw error;
  return true;
}

export async function getGoal(params: { id: string; profile_id: string }) {
  const { id, profile_id } = params;

  const { data, error } = await supabase
    .from("Goal")
    .select("*")
    .eq("id", id)
    .eq("profile_id", profile_id)
    .single();

  if (error) throw error;
  return data;
}

export async function listGoals(params: { profile_id: string }) {
  const { profile_id } = params;

  const { data, error } = await supabase
    .from("Goal")
    .select("*")
    .eq("profile_id", profile_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data; // data will be an array
}
