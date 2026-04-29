import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";

import { TransactionRecurrenceSelectionScreen } from "@/components/transactions/TransactionRecurrenceSelectionScreen";
import { setPendingTransactionRecurrenceSelection } from "@/components/transactions/pending-transaction-recurrence-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function TransactionEditRecurrenceSelectScreen() {
  const navigation = useNavigation();
  const ui = useThemeUI();
  const {
    isRecurring,
    frequency,
    nextRunDate,
    hasEndDate,
    endDate,
  } = useLocalSearchParams<{
    isRecurring?: string;
    frequency?: string;
    nextRunDate?: string;
    hasEndDate?: string;
    endDate?: string;
  }>();

  useEffect(() => {
    navigation.setOptions({
      title: "Recurrence",
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
    <TransactionRecurrenceSelectionScreen
      isRecurring={isRecurring === "true"}
      frequency={frequency ?? "Monthly"}
      nextRunDate={nextRunDate ?? ""}
      hasEndDate={hasEndDate === "true"}
      endDate={endDate ?? ""}
      onSelectRecurrence={(recurrence) => {
        setPendingTransactionRecurrenceSelection(recurrence);
      }}
    />
  );
}
