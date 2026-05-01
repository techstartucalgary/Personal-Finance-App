import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Platform } from "react-native";

import { TransactionAccountSelectionScreen } from "@/components/transactions/TransactionAccountSelectionScreen";
import { setPendingTransactionAccountSelection } from "@/components/transactions/pending-transaction-account-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function AddTransactionAccountSelectScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const ui = useThemeUI();
  const { currentAccountId } = useLocalSearchParams<{ currentAccountId?: string }>();
  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E";
  const sheetUi = useMemo(() => {
    if (!isDark) return ui;
    return {
      ...ui,
      bg: "#1B1B1E",
      surface: "#2C2C2F",
      surface2: "#2C2C2F",
    };
  }, [isDark, ui]);

  useEffect(() => {
    navigation.setOptions({
      title: "Select Account",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : sheetUi.bg,
      },
      headerTitleStyle: { color: sheetUi.text },
      headerTintColor: sheetUi.accent,
    });
  }, [navigation, sheetUi.accent, sheetUi.bg, sheetUi.text]);

  return (
    <TransactionAccountSelectionScreen
      currentAccountId={currentAccountId ? Number(currentAccountId) : null}
      uiOverride={sheetUi}
      onSelectAccount={(account) => {
        setPendingTransactionAccountSelection(account.id);
        router.back();
      }}
    />
  );
}
