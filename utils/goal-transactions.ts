const GOAL_TRANSACTION_PATTERN = /^\[goal:([^\]]+)\]\s*/i;

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
  return -(amount ?? 0);
}
