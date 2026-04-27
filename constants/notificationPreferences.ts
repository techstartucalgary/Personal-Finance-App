export type NotificationPreferenceKey =
  | "deposit"
  | "expense"
  | "unusual"
  | "review"
  | "budget"
  | "budgetNear"
  | "milestones"
  | "offTrack"
  | "checkin"
  | "credit"
  | "creditUtil"
  | "referral";

export type NotificationSectionTitle =
  | "Transactions"
  | "Budget"
  | "Goals"
  | "Credit"
  | "Rewards";

export type NotificationPreferenceDefinition = {
  key: NotificationPreferenceKey;
  id: string;
  label: string;
  section: NotificationSectionTitle;
  defaultEnabled: boolean;
  implemented: boolean;
};

export const NOTIFICATION_PREFERENCES: NotificationPreferenceDefinition[] = [
  {
    key: "deposit",
    id: "notifications.transactions.deposit_posted",
    label: "Deposits posted",
    section: "Transactions",
    defaultEnabled: true,
    implemented: false,
  },
  {
    key: "expense",
    id: "notifications.transactions.large_expense",
    label: "Large expenses",
    section: "Transactions",
    defaultEnabled: true,
    implemented: true,
  },
  {
    key: "unusual",
    id: "notifications.transactions.unusual_activity",
    label: "Unusual activity",
    section: "Transactions",
    defaultEnabled: true,
    implemented: true,
  },
  {
    key: "review",
    id: "notifications.transactions.needs_review",
    label: "Transactions needing review",
    section: "Transactions",
    defaultEnabled: true,
    implemented: true,
  },
  {
    key: "budget",
    id: "notifications.budget.exceeded",
    label: "Budget exceeded",
    section: "Budget",
    defaultEnabled: true,
    implemented: true,
  },
  {
    key: "budgetNear",
    id: "notifications.budget.near_limit",
    label: "Budget nearing limit",
    section: "Budget",
    defaultEnabled: true,
    implemented: true,
  },
  {
    key: "milestones",
    id: "notifications.goals.milestone_reached",
    label: "Milestone reached",
    section: "Goals",
    defaultEnabled: true,
    implemented: true,
  },
  {
    key: "offTrack",
    id: "notifications.goals.off_track",
    label: "Goal off track",
    section: "Goals",
    defaultEnabled: true,
    implemented: true,
  },
  {
    key: "checkin",
    id: "notifications.goals.balance_checkin",
    label: "Balance check-in",
    section: "Goals",
    defaultEnabled: false,
    implemented: false,
  },
  {
    key: "credit",
    id: "notifications.other.credit_score_change",
    label: "Credit score changes",
    section: "Credit",
    defaultEnabled: false,
    implemented: false,
  },
  {
    key: "creditUtil",
    id: "notifications.other.credit_utilization_high",
    label: "High credit utilization",
    section: "Credit",
    defaultEnabled: false,
    implemented: false,
  },
  {
    key: "referral",
    id: "notifications.other.referral_credits",
    label: "Referral credits earned",
    section: "Rewards",
    defaultEnabled: false,
    implemented: false,
  },
];

export const NOTIFICATION_PREFERENCE_ID_BY_KEY: Record<
  NotificationPreferenceKey,
  string
> = Object.fromEntries(
  NOTIFICATION_PREFERENCES.map((item) => [item.key, item.id]),
) as Record<NotificationPreferenceKey, string>;

export const NOTIFICATION_PREFERENCE_DEFAULTS: Record<
  NotificationPreferenceKey,
  boolean
> = Object.fromEntries(
  NOTIFICATION_PREFERENCES.map((item) => [item.key, item.defaultEnabled]),
) as Record<NotificationPreferenceKey, boolean>;
