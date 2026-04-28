import { parseLocalDate } from "@/utils/date";

import type {
  GoalActivityItem,
  GoalRow,
  GoalSelectableAccount,
} from "./types";

export function normalizeGoal(input: any): GoalRow {
  return {
    id: String(input.id),
    name: input.name ?? "",
    target_amount: Number(input.target_amount ?? 0),
    current_amount:
      input.current_amount == null ? null : Number(input.current_amount ?? 0),
    target_date: input.target_date ?? null,
    linked_account: input.linked_account ?? null,
    linked_plaid_account: input.linked_plaid_account ?? null,
    created_at: input.created_at ?? null,
  };
}

export function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
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

export function formatShortDate(value?: string | null) {
  if (!value) return "";
  const parsed = parseLocalDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatActivityDateLabel(value?: string | null) {
  if (!value) return "Recent";
  const parsed = parseLocalDate(value);
  if (Number.isNaN(parsed.getTime())) return "Recent";
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function getGoalProgress(goal: GoalRow) {
  if (!goal.target_amount || goal.target_amount <= 0) return 0;
  return Math.max(
    0,
    Math.min(((goal.current_amount ?? 0) / goal.target_amount) * 100, 100),
  );
}

export function isGoalReached(goal: GoalRow) {
  return (goal.current_amount ?? 0) >= goal.target_amount && goal.target_amount > 0;
}

export function getGoalSelectionKey(account: GoalSelectableAccount | null) {
  if (!account) return null;
  return `${account.isPlaid ? "plaid" : "manual"}:${String(account.id)}`;
}

export function getGoalRowSelectionKey(goal: GoalRow) {
  if (goal.linked_plaid_account) return `plaid:${goal.linked_plaid_account}`;
  if (goal.linked_account != null) return `manual:${goal.linked_account}`;
  return null;
}

export function getGoalFilterAccountId(goal: GoalRow) {
  if (goal.linked_plaid_account) return `plaid:${goal.linked_plaid_account}`;
  return goal.linked_account;
}

export function getGoalLinkedAccountName(
  goal: GoalRow,
  selectableAccounts: GoalSelectableAccount[],
) {
  const match = selectableAccounts.find(
    (account) => getGoalSelectionKey(account) === getGoalRowSelectionKey(goal),
  );
  return match?.name ?? "Unlinked account";
}

export function buildSelectableAccounts(params: {
  manualAccounts: Array<{
    id: number;
    account_name: string | null;
    account_type: string | null;
    balance: number | null;
  }>;
  plaidAccounts: Array<{
    account_id: string;
    name: string;
    type: string;
    institution_name: string | null;
    mask: string | null;
    balances: { current: number | null };
  }>;
}) {
  const manual = params.manualAccounts.map((account) => ({
    id: account.id,
    isPlaid: false,
    name: account.account_name ?? "Unnamed account",
    type: account.account_type,
    balance: account.balance,
  }));

  const plaid = params.plaidAccounts.map((account) => ({
    id: account.account_id,
    isPlaid: true,
    name: account.name,
    type: account.type,
    balance: account.balances.current,
    institutionName: account.institution_name,
    mask: account.mask,
  }));

  return [...manual, ...plaid].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function buildGoalActivity(goals: GoalRow[]) {
  const items: GoalActivityItem[] = goals
    .filter((goal) => (goal.current_amount ?? 0) > 0)
    .map((goal) => ({
      id: `goal-activity:${goal.id}`,
      goalId: goal.id,
      name: goal.name,
      amount: goal.current_amount ?? 0,
      date: goal.created_at ?? goal.target_date ?? null,
      direction: "in" as const,
    }))
    .sort((left, right) => {
      const leftTime = left.date ? parseLocalDate(left.date).getTime() : 0;
      const rightTime = right.date ? parseLocalDate(right.date).getTime() : 0;
      return rightTime - leftTime;
    });

  return items;
}

export function getDaysUntilTarget(goal: GoalRow) {
  if (!goal.target_date) return null;
  const target = parseLocalDate(goal.target_date);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getGoalDeadlineCopy(goal: GoalRow) {
  const days = getDaysUntilTarget(goal);
  if (days == null) return "No target date";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}
