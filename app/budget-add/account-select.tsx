import React from "react";
import { Platform } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { BudgetAccountSelectionScreen } from "@/components/targets/budgets/BudgetAccountSelectionScreen";
import { setPendingBudgetAccountSelection } from "@/components/targets/budgets/pending-budget-account-selection";
import { useTabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function BudgetAddAccountSelectScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const { ui } = useTabsTheme();
  const { currentAccountKey } = useLocalSearchParams<{ currentAccountKey?: string }>();

  React.useEffect(() => {
    navigation.setOptions({
      title: "Select Account",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.text,
    });
  }, [navigation, ui.bg, ui.text]);

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
