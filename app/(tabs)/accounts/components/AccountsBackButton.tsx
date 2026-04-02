import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable } from "react-native";

import { tabsTheme } from "@/constants/tabsTheme";

import { styles } from "../styles";

type Ui = typeof tabsTheme.ui;

type AccountsBackButtonProps = {
  ui: Ui;
  tabBarHeight: number;
  onPress: () => void;
};

// Overlay button used when a single account is focused.
export function AccountsBackButton({
  ui,
  tabBarHeight,
  onPress,
}: AccountsBackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back to all accounts"
      style={({ pressed }) => [
        styles.backButton,
        styles.backButtonOverlay,
        {
          borderColor: ui.border,
          backgroundColor: pressed ? ui.surface2 : ui.surface,
          opacity: pressed ? 0.85 : 1,
          bottom: tabBarHeight + 8,
        },
      ]}
    >
      <Feather name="chevron-left" size={18} color={ui.text} />
    </Pressable>
  );
}
