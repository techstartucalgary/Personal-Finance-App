export type PendingTransactionRecurrenceSelection = {
  isRecurring: boolean;
  frequency: string;
  nextRunDate: string;
  hasEndDate: boolean;
  endDate: string;
};

let pendingTransactionRecurrence: PendingTransactionRecurrenceSelection | null = null;
let hasPendingTransactionRecurrence = false;

export function setPendingTransactionRecurrenceSelection(
  nextRecurrence: PendingTransactionRecurrenceSelection,
) {
  pendingTransactionRecurrence = nextRecurrence;
  hasPendingTransactionRecurrence = true;
}

export function consumePendingTransactionRecurrenceSelection() {
  if (!hasPendingTransactionRecurrence) return undefined;
  const nextRecurrence = pendingTransactionRecurrence;
  pendingTransactionRecurrence = null;
  hasPendingTransactionRecurrence = false;
  return nextRecurrence;
}
