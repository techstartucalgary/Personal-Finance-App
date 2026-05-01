import { deleteExpense } from "./expenses";
import { updateGoalCurrentAmountByDelta } from "./goals";

const GOAL_TRANSACTION_PATTERN = /^\[goal:([^\]]+)\]\s*/i;

type GoalLabelRow = {
  id: string | number;
  name?: string | null;
};

export function extractGoalTransactionGoalId(description?: string | null) {
  if (!description) return null;
  const match = description.match(GOAL_TRANSACTION_PATTERN);
  return match?.[1] ? String(match[1]).trim() : null;
}

export function stripGoalTransactionMarker(description?: string | null) {
  if (!description) return "";
  return description.replace(GOAL_TRANSACTION_PATTERN, "").trim();
}

export function buildGoalTransactionDescription(
  goalId: string | number,
  description?: string | null,
) {
  const cleanDescription = stripGoalTransactionMarker(description);
  return cleanDescription
    ? `[goal:${String(goalId)}] ${cleanDescription}`
    : `[goal:${String(goalId)}]`;
}

export function isGoalTransactionForGoal(
  description: string | null | undefined,
  goalId: string | number,
) {
  return extractGoalTransactionGoalId(description) === String(goalId);
}

export function getGoalDeltaFromTransactionAmount(amount?: number | null) {
  return Math.abs(amount ?? 0);
}

export function getGoalAllocationTitle(
  description?: string | null,
  goals: GoalLabelRow[] = [],
) {
  const goalId = extractGoalTransactionGoalId(description);
  if (!goalId) return stripGoalTransactionMarker(description) || "Manual transaction";

  const goal = goals.find((item) => String(item.id) === goalId);
  const goalName = goal?.name?.trim();
  return goalName ? `Goal Allocation (${goalName})` : "Goal Allocation";
}

export async function deleteGoalTransaction(params: {
  id: string;
  profile_id: string;
  amount?: number | null;
  description?: string | null;
}) {
  const { id, profile_id, amount, description } = params;
  const goalId = extractGoalTransactionGoalId(description);

  if (!goalId) {
    throw new Error("Expense is not linked to a goal.");
  }

  await deleteExpense({ id, profile_id });

  await updateGoalCurrentAmountByDelta({
    id: goalId,
    profile_id,
    delta: -getGoalDeltaFromTransactionAmount(amount),
  });

  return true;
}
