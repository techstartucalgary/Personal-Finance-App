import { supabase } from "./supabase";

export type RecurringRuleInsert = {
    profile_id: string;
    account_id: string | number;
    name: string;
    amount: number;
    frequency: string;          // "daily, weekly, monthly"
    next_run_date: string;      // "YYYY-MM-DD"
    end_date?: string | null;
    is_active?: boolean | null;
    expense_categoryid?: string | number | null;
    subcategory_id?: string | number | null;
  };
  
  export type RecurringRuleUpdate = Partial<Omit<RecurringRuleInsert, "profile_id">>;
  

  export async function createRecurringRule(input: RecurringRuleInsert) {
    const { data, error } = await supabase
      .from("recurring_expense_rules")
      .insert(input)
      .select("*")
      .single();
  
    if (error) throw error;
    return data;
  }


export async function updateRecurringRule(params: {
    id: string | number;
    profile_id: string;
    updates: RecurringRuleUpdate;
  }) {
    const { id, profile_id, updates } = params;
  
    const { data, error } = await supabase
      .from("recurring_expense_rules")
      .update(updates)
      .eq("id", id)
      .eq("profile_id", profile_id)
      .select("*")
      .single();
  
    if (error) throw error;
    return data;
  }


  export async function deleteRecurringRule(params: {
    id: string | number;
    profile_id: string;
  }) {
    const { id, profile_id } = params;
  
    const { error } = await supabase
      .from("recurring_expense_rules")
      .delete()
      .eq("id", id)
      .eq("profile_id", profile_id);
  
    if (error) throw error;
    return true;
  }

  export async function listDueRecurringRules(params: {
    profile_id: string;
    today: string; 
  }) {
    const { profile_id, today } = params;
  
    const { data, error } = await supabase
      .from("recurring_expense_rules")
      .select("*")
      .eq("profile_id", profile_id)
      .eq("is_active", true)
      .lte("next_run_date", today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("next_run_date", { ascending: true });
  
    if (error) throw error;
    return data; // array
  }