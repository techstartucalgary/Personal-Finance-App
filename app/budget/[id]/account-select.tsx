import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { BudgetAccountSelectionScreen } from "@/components/targets/budgets/BudgetAccountSelectionScreen";
import { setPendingBudgetAccountSelection } from "@/components/targets/budgets/pending-budget-account-selection";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function BudgetEditAccountSelectScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const { currentAccountKey } = useLocalSearchParams<{ currentAccountKey?: string }>();

  return (
    <BudgetAccountSelectionScreen
      userId={session?.user.id}
      currentAccountKey={currentAccountKey ?? null}
      onSelectAccount={(account) => {
        setPendingBudgetAccountSelection(account);
        router.back();
      }}
      onClearSelection={() => {
        setPendingBudgetAccountSelection(null);
        router.back();
      }}
    />
  );
}
