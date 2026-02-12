import { supabase } from "./supabase";

export type BudgetPeriod = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export type CategoryBudgetInsert = {
    budget_id: number;
    expense_category_id: number;
    limit_amount: number;
    budget_period: BudgetPeriod;
};

export type CategoryBudgetRow = {
    id: number;
    created_at?: string | null;
    budget_id: number;
    expense_category_id: number;
    limit_amount: number;
    budget_period: BudgetPeriod;
};

export async function createCategoryBudget(input: CategoryBudgetInsert) {
    const { data, error } = await supabase
        .from("Expense_category_budget")
        .insert(input)
        .select("*")
        .single();

    if (error) throw error;
    return data as CategoryBudgetRow;
}

export async function listCategoryBudgets(params: { budget_id: number }) {
    const { budget_id } = params;

    const { data, error } = await supabase
        .from("Expense_category_budget")
        .select("*")
        .eq("budget_id", budget_id)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as CategoryBudgetRow[];
}

export async function deleteCategoryBudget(params: { id: number }) {
    const { id } = params;

    const { error } = await supabase
        .from("Expense_category_budget")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return true;
}

/**
 * Returns { start, end } ISO date strings for the current period window.
 */
export function getPeriodDateRange(
    period: BudgetPeriod,
    referenceDate: Date = new Date()
): { start: string; end: string } {
    const ref = new Date(referenceDate);
    let start: Date;
    let end: Date;

    switch (period) {
        case "weekly": {
            const day = ref.getDay(); // 0=Sun
            start = new Date(ref);
            start.setDate(ref.getDate() - day); // start of week (Sunday)
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            break;
        }
        case "biweekly": {
            // Two-week window starting from the beginning of the year
            const yearStart = new Date(ref.getFullYear(), 0, 1);
            const daysSinceYearStart = Math.floor(
                (ref.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
            );
            const biweekIndex = Math.floor(daysSinceYearStart / 14);
            start = new Date(yearStart);
            start.setDate(yearStart.getDate() + biweekIndex * 14);
            end = new Date(start);
            end.setDate(start.getDate() + 13);
            break;
        }
        case "monthly": {
            start = new Date(ref.getFullYear(), ref.getMonth(), 1);
            end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0); // last day of month
            break;
        }
        case "quarterly": {
            const quarter = Math.floor(ref.getMonth() / 3);
            start = new Date(ref.getFullYear(), quarter * 3, 1);
            end = new Date(ref.getFullYear(), quarter * 3 + 3, 0);
            break;
        }
        case "yearly": {
            start = new Date(ref.getFullYear(), 0, 1);
            end = new Date(ref.getFullYear(), 11, 31);
            break;
        }
    }

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return { start: fmt(start), end: fmt(end) };
}

/**
 * Sums expense amounts for a given category within a date range.
 */
export async function getCategorySpending(params: {
    profile_id: string;
    expense_category_id: number;
    start_date: string;
    end_date: string;
}): Promise<number> {
    const { profile_id, expense_category_id, start_date, end_date } = params;

    const { data, error } = await supabase
        .from("Expense")
        .select("amount")
        .eq("profile_id", profile_id)
        .eq("expense_categoryid", expense_category_id)
        .gte("transaction_date", start_date)
        .lte("transaction_date", end_date + "T23:59:59.999Z");

    if (error) throw error;

    return (data ?? []).reduce((sum, row: any) => sum + (row.amount ?? 0), 0);
}
