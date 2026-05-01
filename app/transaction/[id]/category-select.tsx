import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";

import { TransactionCategorySelectionScreen } from "@/components/transactions/TransactionCategorySelectionScreen";
import { setPendingTransactionCategorySelection } from "@/components/transactions/pending-transaction-category-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function TransactionEditCategorySelectScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const ui = useThemeUI();
  const { currentCategoryId, transactionType } = useLocalSearchParams<{
    currentCategoryId?: string;
    transactionType?: "expense" | "income" | "transfer";
  }>();

  useEffect(() => {
    navigation.setOptions({
      title: "Select Category",
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
    <TransactionCategorySelectionScreen
      currentCategoryId={currentCategoryId ? Number(currentCategoryId) : null}
      transactionType={transactionType ?? "expense"}
      onSelectCategory={(category) => {
        setPendingTransactionCategorySelection(category);
        router.back();
      }}
    />
  );
}
