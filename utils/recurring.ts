import { supabase } from "./supabase";

export interface RecurringExpenseRuleInsert {
    profile_id: string;
    name: string;
    amount: number;
    frequency: string; // 'Daily', 'Weekly', 'Monthly', 'Yearly'
    next_run_date: string;
    end_date?: string | null;
    is_active?: boolean;
    account_id: number;
    expense_categoryid: number;
    subcategory_id?: number | null;
}

export type RecurringExpenseRuleUpdate = Partial<Omit<RecurringExpenseRuleInsert, "profile_id">>;

export async function createRecurringRule(rule: RecurringExpenseRuleInsert) {
    const { data, error } = await supabase
        .from("recurring_expense_rules")
        .insert(rule)
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function updateRecurringRule(params: {
    id: number;
    profile_id: string;
    update: RecurringExpenseRuleUpdate;
}) {
    const { id, profile_id, update } = params;

    const { data, error } = await supabase
        .from("recurring_expense_rules")
        .update(update)
        .eq("id", id)
        .eq("profile_id", profile_id)
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function deleteRecurringRule(params: {
    id: number;
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

export async function getRecurringRules(params: { profile_id: string }) {
    const { profile_id } = params;

    const { data, error } = await supabase
        .from("recurring_expense_rules")
        .select("*")
        .eq("profile_id", profile_id)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}
