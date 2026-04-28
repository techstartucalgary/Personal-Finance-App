import type { BudgetSelectableAccount } from "./types";

let pendingBudgetAccountSelection: BudgetSelectableAccount | null | undefined;

export function setPendingBudgetAccountSelection(
  nextSelection: BudgetSelectableAccount | null,
) {
  pendingBudgetAccountSelection = nextSelection;
}

export function consumePendingBudgetAccountSelection() {
  const nextSelection = pendingBudgetAccountSelection;
  pendingBudgetAccountSelection = undefined;
  return nextSelection;
}
