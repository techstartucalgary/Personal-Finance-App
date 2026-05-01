let pendingTransactionAccountId: number | null = null;

export function setPendingTransactionAccountSelection(nextAccountId: number) {
  pendingTransactionAccountId = nextAccountId;
}

export function consumePendingTransactionAccountSelection() {
  const nextAccountId = pendingTransactionAccountId;
  pendingTransactionAccountId = null;
  return nextAccountId;
}
