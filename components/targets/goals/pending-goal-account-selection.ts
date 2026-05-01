import type { GoalSelectableAccount } from "./types";

let pendingGoalAccountSelection: GoalSelectableAccount | null = null;

export function setPendingGoalAccountSelection(
  nextSelection: GoalSelectableAccount,
) {
  pendingGoalAccountSelection = nextSelection;
}

export function consumePendingGoalAccountSelection() {
  const nextSelection = pendingGoalAccountSelection;
  pendingGoalAccountSelection = null;
  return nextSelection;
}
