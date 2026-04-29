import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

import { BudgetExpenseSelectionScreen } from "@/components/targets/budgets/BudgetExpenseSelectionScreen";
import { setPendingBudgetExpenseSelection } from "@/components/targets/budgets/pending-budget-editor-selection";
import { useAuthContext } from "@/hooks/use-auth-context";

function parseExcludedIds(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
}

export default function BudgetAddExpenseSelectScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const { excludedCategoryIds } = useLocalSearchParams<{
    excludedCategoryIds?: string;
  }>();

  return (
    <BudgetExpenseSelectionScreen
      userId={session?.user.id}
      excludedCategoryIds={parseExcludedIds(excludedCategoryIds)}
      onSelectCategory={(category) => {
        setPendingBudgetExpenseSelection(category);
        router.back();
      }}
    />
  );
}
