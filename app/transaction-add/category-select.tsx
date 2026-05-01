import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Platform } from "react-native";

import { TransactionCategorySelectionScreen } from "@/components/transactions/TransactionCategorySelectionScreen";
import { setPendingTransactionCategorySelection } from "@/components/transactions/pending-transaction-category-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function AddTransactionCategorySelectScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const ui = useThemeUI();
  const { currentCategoryId, transactionType } = useLocalSearchParams<{
    currentCategoryId?: string;
    transactionType?: "expense" | "income" | "transfer";
  }>();
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
      title: "Select Category",
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
    <TransactionCategorySelectionScreen
      currentCategoryId={currentCategoryId ? Number(currentCategoryId) : null}
      transactionType={transactionType ?? "expense"}
      uiOverride={sheetUi}
      onSelectCategory={(category) => {
        setPendingTransactionCategorySelection(category);
        router.back();
      }}
    />
  );
}
