import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";

import { TransactionAccountSelectionScreen } from "@/components/transactions/TransactionAccountSelectionScreen";
import { setPendingTransactionAccountSelection } from "@/components/transactions/pending-transaction-account-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function TransactionEditAccountSelectScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const ui = useThemeUI();
  const { currentAccountId } = useLocalSearchParams<{ currentAccountId?: string }>();

  useEffect(() => {
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
      headerTintColor: ui.accent,
    });
  }, [navigation, ui.accent, ui.bg, ui.text]);

  return (
    <TransactionAccountSelectionScreen
      currentAccountId={currentAccountId ? Number(currentAccountId) : null}
      onSelectAccount={(account) => {
        setPendingTransactionAccountSelection(account.id);
        router.back();
      }}
    />
  );
}
