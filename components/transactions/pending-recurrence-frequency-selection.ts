export type RecurrenceFrequency = "Daily" | "Weekly" | "Monthly" | "Yearly";

let pendingRecurrenceFrequency: RecurrenceFrequency | null = null;
let hasPendingRecurrenceFrequency = false;

export function setPendingRecurrenceFrequencySelection(
  nextFrequency: RecurrenceFrequency | null,
) {
  pendingRecurrenceFrequency = nextFrequency;
  hasPendingRecurrenceFrequency = true;
}

export function consumePendingRecurrenceFrequencySelection() {
  if (!hasPendingRecurrenceFrequency) return undefined;
  const nextFrequency = pendingRecurrenceFrequency;
  pendingRecurrenceFrequency = null;
  hasPendingRecurrenceFrequency = false;
  return nextFrequency;
}
