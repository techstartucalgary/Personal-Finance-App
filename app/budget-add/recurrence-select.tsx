import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

import { BudgetRecurrenceSelectionScreen } from "@/components/targets/budgets/BudgetRecurrenceSelectionScreen";
import { setPendingBudgetRecurrenceSelection } from "@/components/targets/budgets/pending-budget-editor-selection";
import { BUDGET_PERIOD_OPTIONS } from "@/components/targets/budgets/utils";
import type { BudgetPeriod } from "@/utils/categoryBudgets";

function getPeriod(value?: string): BudgetPeriod {
  return BUDGET_PERIOD_OPTIONS.includes(value as BudgetPeriod)
    ? (value as BudgetPeriod)
    : "monthly";
}

export default function BudgetAddRecurrenceSelectScreen() {
  const router = useRouter();
  const { currentPeriod } = useLocalSearchParams<{ currentPeriod?: string }>();

  return (
    <BudgetRecurrenceSelectionScreen
      currentPeriod={getPeriod(currentPeriod)}
      onSelectPeriod={(period) => {
        setPendingBudgetRecurrenceSelection(period);
        router.back();
      }}
    />
  );
}
