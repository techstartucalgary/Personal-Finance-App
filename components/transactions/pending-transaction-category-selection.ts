import type { CategoryRow } from "@/components/AddTransactionModal";

let pendingTransactionCategory: CategoryRow | null = null;
let hasPendingTransactionCategory = false;

export function setPendingTransactionCategorySelection(nextCategory: CategoryRow | null) {
  pendingTransactionCategory = nextCategory;
  hasPendingTransactionCategory = true;
}

export function consumePendingTransactionCategorySelection() {
  if (!hasPendingTransactionCategory) return undefined;
  const nextCategory = pendingTransactionCategory;
  pendingTransactionCategory = null;
  hasPendingTransactionCategory = false;
  return nextCategory;
}
