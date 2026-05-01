import type { ExpenseRow, FilterAccountId } from "@/components/transactions/tab/types";
import type { TabsUi } from "@/constants/tabsTheme";
import type { BudgetPeriod, CategoryBudgetRow } from "@/utils/categoryBudgets";
import type { CategoryRow, SubcategoryRow } from "@/utils/categories";

import type { GoalSelectableAccount } from "../goals/types";

export type BudgetRow = {
  id: number;
  profile_id: string;
  budget_name: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  created_at?: string | null;
};

export type BudgetDraftCategory = {
  localKey: string;
  expense_category_id: number;
  category_name: string;
  limit_amount: string;
};

export type BudgetUiPreference = {
  linkedAccountKey: string | null;
  rolloverEnabled: boolean;
};

export type BudgetSubcategoryView = {
  id: number;
  name: string;
  spent: number;
  transactionCount: number;
};

export type BudgetCategoryView = CategoryBudgetRow & {
  category_name: string;
  spent: number;
  available: number;
  progress: number;
  transactions: ExpenseRow[];
  subcategories: BudgetSubcategoryView[];
};

export type BudgetWithDetails = BudgetRow &
  BudgetUiPreference & {
    recurrence: BudgetPeriod;
    categoryBudgets: BudgetCategoryView[];
    spentAmount: number;
    availableAmount: number;
    status: "balanced" | "overspent";
  };

export type BudgetSelectableAccount = GoalSelectableAccount;
export type BudgetsUi = TabsUi;
export type BudgetPreferencesMap = Record<string, BudgetUiPreference>;

export type BudgetBuildCollections = {
  budgets: BudgetRow[];
  categoryBudgets: CategoryBudgetRow[];
  categories: CategoryRow[];
  subcategories: SubcategoryRow[];
  expenses: ExpenseRow[];
  preferences?: BudgetPreferencesMap;
  filterAccountId?: FilterAccountId;
};
