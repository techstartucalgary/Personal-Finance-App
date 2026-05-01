import React from "react";
import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { tabsTheme } from "@/constants/tabsTheme";

import { styles } from "./styles";

type Ui = typeof tabsTheme.ui;

type AccountsEmptyStateProps = {
  ui: Ui;
  message: string;
};

// Standard empty-state card used across account sections.
export function AccountsEmptyState({ ui, message }: AccountsEmptyStateProps) {
  return (
    <View
      style={[
        styles.emptyState,
        { borderColor: ui.border, backgroundColor: ui.surface2 },
      ]}
    >
      <ThemedText style={{ color: ui.text }}>{message}</ThemedText>
    </View>
  );
}
