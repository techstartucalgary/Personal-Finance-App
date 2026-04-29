import type { SubcategoryRow } from "@/components/AddTransactionModal";

let pendingTransactionSubcategory: SubcategoryRow | null = null;
let hasPendingTransactionSubcategory = false;

export function setPendingTransactionSubcategorySelection(
  nextSubcategory: SubcategoryRow | null,
) {
  pendingTransactionSubcategory = nextSubcategory;
  hasPendingTransactionSubcategory = true;
}

export function consumePendingTransactionSubcategorySelection() {
  if (!hasPendingTransactionSubcategory) return undefined;
  const nextSubcategory = pendingTransactionSubcategory;
  pendingTransactionSubcategory = null;
  hasPendingTransactionSubcategory = false;
  return nextSubcategory;
}
