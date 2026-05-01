import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";

import { TransactionSubcategorySelectionScreen } from "@/components/transactions/TransactionSubcategorySelectionScreen";
import { setPendingTransactionSubcategorySelection } from "@/components/transactions/pending-transaction-subcategory-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function TransactionEditSubcategorySelectScreen() {
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

  useEffect(() => {
    navigation.setOptions({
      title: "Select Subcategory",
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
    <TransactionSubcategorySelectionScreen
      categoryId={categoryId ? Number(categoryId) : null}
      categoryName={categoryName ?? null}
      currentSubcategoryId={currentSubcategoryId ? Number(currentSubcategoryId) : null}
      transactionType={transactionType ?? "expense"}
      onSelectSubcategory={(subcategory) => {
        setPendingTransactionSubcategorySelection(subcategory);
        router.back();
      }}
    />
  );
}
