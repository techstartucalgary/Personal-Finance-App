import type { AccountRow, ExpenseRow, FilterAccountId } from "@/components/transactions/tab/types";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import type { PlaidAccount } from "@/utils/plaid";

import type {
  BudgetBuildCollections,
  BudgetCategoryView,
  BudgetPreferencesMap,
  BudgetRow,
  BudgetSubcategoryView,
  BudgetUiPreference,
  BudgetWithDetails,
} from "./types";

import type { BudgetPeriod } from "@/utils/categoryBudgets";

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const DEFAULT_PREFERENCE: BudgetUiPreference = {
  linkedAccountKey: null,
  rolloverEnabled: false,
};

export function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

export function formatBudgetPeriodLabel(period: BudgetPeriod) {
  return PERIOD_LABELS[period];
}

export function formatShortDate(value?: string | null) {
  if (!value) return "";
  const parsed = parseLocalDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(value?: string | null) {
  if (!value) return "No date";
  const parsed = parseLocalDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBudgetDateRange(budget: Pick<BudgetRow, "start_date" | "end_date">) {
  return `${formatShortDate(budget.start_date)} - ${formatShortDate(budget.end_date)}`;
}

export function getBudgetEndDate(startDate: string, period: BudgetPeriod) {
  const parsed = parseLocalDate(startDate);
  if (Number.isNaN(parsed.getTime())) return startDate;

  const endDate = new Date(parsed);
  switch (period) {
    case "weekly":
      endDate.setDate(endDate.getDate() + 6);
      break;
    case "biweekly":
      endDate.setDate(endDate.getDate() + 13);
      break;
    case "monthly":
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      break;
    case "quarterly":
      endDate.setMonth(endDate.getMonth() + 3);
      endDate.setDate(endDate.getDate() - 1);
      break;
    case "yearly":
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1);
      break;
  }

  return toLocalISOString(endDate);
}

export function getBudgetStatusCopy(availableAmount: number) {
  return availableAmount < 0 ? "Over Budget" : "Balanced";
}

export function getBudgetStatusTone(availableAmount: number) {
  return availableAmount < 0 ? "#D55C4B" : "#2D9F67";
}

export function getBudgetSelectionKey(filterAccountId: FilterAccountId) {
  if (filterAccountId == null) return null;
  if (typeof filterAccountId === "string" && filterAccountId.startsWith("plaid:")) {
    return filterAccountId;
  }
  return `manual:${String(filterAccountId)}`;
}

export function resolveBudgetPreference(
  preference?: Partial<BudgetUiPreference> | null,
): BudgetUiPreference {
  return {
    linkedAccountKey:
      preference?.linkedAccountKey === undefined
        ? DEFAULT_PREFERENCE.linkedAccountKey
        : preference.linkedAccountKey,
    rolloverEnabled:
      preference?.rolloverEnabled === undefined
        ? DEFAULT_PREFERENCE.rolloverEnabled
        : Boolean(preference.rolloverEnabled),
  };
}

function matchesActiveAccountFilter(
  expense: ExpenseRow,
  filterAccountId: FilterAccountId | undefined,
) {
  if (filterAccountId == null) return true;
  if (typeof filterAccountId === "string") {
    return false;
  }

  return expense.account_id === filterAccountId;
}

function getExpenseDate(expense: ExpenseRow) {
  return expense.transaction_date ?? expense.created_at?.split("T")[0] ?? null;
}

function matchesExpenseForBudget(
  expense: ExpenseRow,
  budget: Pick<BudgetRow, "start_date" | "end_date">,
  linkedAccountKey: string | null,
  filterAccountId?: FilterAccountId,
) {
  const date = getExpenseDate(expense);
  if (!date) return false;
  if (date < budget.start_date || date > budget.end_date) return false;
  if (!matchesActiveAccountFilter(expense, filterAccountId)) return false;

  if (!linkedAccountKey) return true;
  if (!linkedAccountKey.startsWith("manual:")) return true;

  return expense.account_id === Number(linkedAccountKey.replace("manual:", ""));
}

export function getBudgetCategorySpent(params: {
  expenses: ExpenseRow[];
  expenseCategoryId: number;
  startDate: string;
  endDate: string;
  linkedAccountKey: string | null;
  filterAccountId?: FilterAccountId;
}) {
  const { expenses, expenseCategoryId, startDate, endDate, linkedAccountKey, filterAccountId } =
    params;

  return expenses
    .filter(
      (expense) =>
        Number(expense.expense_categoryid) === Number(expenseCategoryId) &&
        matchesExpenseForBudget(
          expense,
          { start_date: startDate, end_date: endDate },
          linkedAccountKey,
          filterAccountId,
        ),
    )
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
}

export function getBudgetCategorySubcategoryBreakdown(params: {
  expenses: ExpenseRow[];
  subcategories: BudgetBuildCollections["subcategories"];
  expenseCategoryId: number;
  startDate: string;
  endDate: string;
  linkedAccountKey: string | null;
  filterAccountId?: FilterAccountId;
}) {
  const {
    expenses,
    subcategories,
    expenseCategoryId,
    startDate,
    endDate,
    linkedAccountKey,
    filterAccountId,
  } = params;

  const grouped = new Map<number, BudgetSubcategoryView>();

  expenses.forEach((expense) => {
    if (Number(expense.expense_categoryid) !== Number(expenseCategoryId)) return;
    if (expense.subcategory_id == null) return;
    if (
      !matchesExpenseForBudget(
        expense,
        { start_date: startDate, end_date: endDate },
        linkedAccountKey,
        filterAccountId,
      )
    ) {
      return;
    }

    const subcategoryId = Number(expense.subcategory_id);
    const match = subcategories.find((entry) => entry.id === subcategoryId);
    const current = grouped.get(subcategoryId);

    if (current) {
      current.spent += Number(expense.amount ?? 0);
      current.transactionCount += 1;
      return;
    }

    grouped.set(subcategoryId, {
      id: subcategoryId,
      name: match?.category_name ?? "Subcategory",
      spent: Number(expense.amount ?? 0),
      transactionCount: 1,
    });
  });

  return Array.from(grouped.values()).sort((left, right) => right.spent - left.spent);
}

export function buildBudgetWithDetails(params: {
  budget: BudgetRow;
  categoryBudgets: BudgetBuildCollections["categoryBudgets"];
  categories: BudgetBuildCollections["categories"];
  subcategories: BudgetBuildCollections["subcategories"];
  expenses: BudgetBuildCollections["expenses"];
  preference?: Partial<BudgetUiPreference> | null;
  filterAccountId?: FilterAccountId;
}) {
  const {
    budget,
    categoryBudgets,
    categories,
    subcategories,
    expenses,
    preference,
    filterAccountId,
  } = params;
  const resolvedPreference = resolveBudgetPreference(preference);
  const links = categoryBudgets.filter((entry) => entry.budget_id === budget.id);
  const recurrence = links[0]?.budget_period ?? "monthly";

  const categoryViews: BudgetCategoryView[] = links.map((link) => {
    const relatedTransactions = expenses.filter(
      (expense) =>
        Number(expense.expense_categoryid) === Number(link.expense_category_id) &&
        matchesExpenseForBudget(
          expense,
          budget,
          resolvedPreference.linkedAccountKey,
          filterAccountId,
        ),
    );
    const spent = relatedTransactions.reduce(
      (sum, expense) => sum + Number(expense.amount ?? 0),
      0,
    );
    const available = link.limit_amount - spent;
    const progress =
      link.limit_amount > 0 ? Math.min(Math.max((spent / link.limit_amount) * 100, 0), 100) : 0;
    const categoryName =
      categories.find((category) => category.id === link.expense_category_id)?.category_name ??
      "Expense";
    const subcategoryBreakdown = getBudgetCategorySubcategoryBreakdown({
      expenses,
      subcategories,
      expenseCategoryId: link.expense_category_id,
      startDate: budget.start_date,
      endDate: budget.end_date,
      linkedAccountKey: resolvedPreference.linkedAccountKey,
      filterAccountId,
    });

    return {
      ...link,
      category_name: categoryName,
      spent,
      available,
      progress,
      transactions: relatedTransactions.sort((left, right) => {
        const leftTime = new Date(left.transaction_date || left.created_at || 0).getTime();
        const rightTime = new Date(right.transaction_date || right.created_at || 0).getTime();
        return rightTime - leftTime;
      }),
      subcategories: subcategoryBreakdown,
    };
  });

  const spentAmount = categoryViews.reduce((sum, entry) => sum + entry.spent, 0);
  const availableAmount = Number(budget.total_amount ?? 0) - spentAmount;

  return {
    ...budget,
    ...resolvedPreference,
    recurrence,
    categoryBudgets: categoryViews,
    spentAmount,
    availableAmount,
    status: availableAmount < 0 ? "overspent" : "balanced",
  } satisfies BudgetWithDetails;
}

export function buildBudgetCollection(params: BudgetBuildCollections) {
  const preferences: BudgetPreferencesMap = params.preferences ?? {};
  const filterAccountId = (params as BudgetBuildCollections & {
    filterAccountId?: FilterAccountId;
  }).filterAccountId;

  return params.budgets
    .map((budget) =>
      buildBudgetWithDetails({
        budget,
        categoryBudgets: params.categoryBudgets,
        categories: params.categories,
        subcategories: params.subcategories,
        expenses: params.expenses,
        preference: preferences[String(budget.id)],
        filterAccountId,
      }),
    )
    .sort((left, right) => {
      const rightTime = new Date(right.created_at || right.start_date || 0).getTime();
      const leftTime = new Date(left.created_at || left.start_date || 0).getTime();
      return rightTime - leftTime;
    });
}

export function filterBudgetsByAccount(
  budgets: BudgetWithDetails[],
  _filterAccountId: FilterAccountId,
) {
  return budgets;
}

function sumTrackedBalances(params: {
  accounts: AccountRow[];
  plaidAccounts: PlaidAccount[];
  filterAccountId: FilterAccountId;
}) {
  if (params.filterAccountId == null) {
    return (
      params.accounts.reduce((sum, account) => sum + Number(account.balance ?? 0), 0) +
      params.plaidAccounts.reduce(
        (sum, account) => sum + Number(account.balances.current ?? 0),
        0,
      )
    );
  }

  if (typeof params.filterAccountId === "string" && params.filterAccountId.startsWith("plaid:")) {
    const plaidId = params.filterAccountId.replace("plaid:", "");
    const match = params.plaidAccounts.find((account) => account.account_id === plaidId);
    return Number(match?.balances.current ?? 0);
  }

  const match = params.accounts.find((account) => account.id === params.filterAccountId);
  return Number(match?.balance ?? 0);
}

export function getBudgetOverview(
  budgets: BudgetWithDetails[],
  params: {
    accounts: AccountRow[];
    plaidAccounts: PlaidAccount[];
    filterAccountId: FilterAccountId;
  },
) {
  const totalBudgeted = budgets.reduce(
    (sum, budget) => sum + Number(budget.total_amount ?? 0),
    0,
  );
  const totalTrackedFunds = sumTrackedBalances(params);
  const totalFundsAvailable = totalTrackedFunds - totalBudgeted;

  return {
    totalBudgeted,
    totalFundsAvailable,
    statusLabel: getBudgetStatusCopy(totalFundsAvailable),
    statusColor: getBudgetStatusTone(totalFundsAvailable),
  };
}
