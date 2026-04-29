import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Platform } from "react-native";

import { TransactionRecurrenceSelectionScreen } from "@/components/transactions/TransactionRecurrenceSelectionScreen";
import { setPendingTransactionRecurrenceSelection } from "@/components/transactions/pending-transaction-recurrence-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function AddTransactionRecurrenceSelectScreen() {
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
      title: "Recurrence",
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
    <TransactionRecurrenceSelectionScreen
      isRecurring={isRecurring === "true"}
      frequency={frequency ?? "Monthly"}
      nextRunDate={nextRunDate ?? ""}
      hasEndDate={hasEndDate === "true"}
      endDate={endDate ?? ""}
      uiOverride={sheetUi}
      onSelectRecurrence={(recurrence) => {
        setPendingTransactionRecurrenceSelection(recurrence);
      }}
    />
  );
}
