import type { BudgetPeriod } from "@/utils/categoryBudgets";
import type { CategoryRow } from "@/utils/categories";

let pendingBudgetRecurrenceSelection: BudgetPeriod | undefined;
let pendingBudgetExpenseSelection: CategoryRow | undefined;

export function setPendingBudgetRecurrenceSelection(nextSelection: BudgetPeriod) {
  pendingBudgetRecurrenceSelection = nextSelection;
}

export function consumePendingBudgetRecurrenceSelection() {
  const nextSelection = pendingBudgetRecurrenceSelection;
  pendingBudgetRecurrenceSelection = undefined;
  return nextSelection;
}

export function setPendingBudgetExpenseSelection(nextSelection: CategoryRow) {
  pendingBudgetExpenseSelection = nextSelection;
}

export function consumePendingBudgetExpenseSelection() {
  const nextSelection = pendingBudgetExpenseSelection;
  pendingBudgetExpenseSelection = undefined;
  return nextSelection;
}
