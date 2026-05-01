import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Platform } from "react-native";

import { TransactionSubcategorySelectionScreen } from "@/components/transactions/TransactionSubcategorySelectionScreen";
import { setPendingTransactionSubcategorySelection } from "@/components/transactions/pending-transaction-subcategory-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function AddTransactionSubcategorySelectScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const ui = useThemeUI();
  const {
    categoryId,
    categoryName,
    currentSubcategoryId,
    transactionType,
  } = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
    currentSubcategoryId?: string;
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
      title: "Select Subcategory",
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
    <TransactionSubcategorySelectionScreen
      categoryId={categoryId ? Number(categoryId) : null}
      categoryName={categoryName ?? null}
      currentSubcategoryId={currentSubcategoryId ? Number(currentSubcategoryId) : null}
      transactionType={transactionType ?? "expense"}
      uiOverride={sheetUi}
      onSelectSubcategory={(subcategory) => {
        setPendingTransactionSubcategorySelection(subcategory);
        router.back();
      }}
    />
  );
}
