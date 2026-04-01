import React from "react";
import { Pressable } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { tabsTheme } from "@/constants/tabsTheme";

import { styles } from "../styles";

type Ui = typeof tabsTheme.ui;

type AccountsFabProps = {
  ui: Ui;
  fabBottom: number;
  onPress: () => void;
};

// Floating action button for the "add account" primary action.
export function AccountsFab({ ui, fabBottom, onPress }: AccountsFabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          width: 60,
          height: 60,
          borderRadius: 16,
          right: 16,
        },
        {
          backgroundColor: ui.text,
          opacity: pressed ? 0.8 : 1,
          bottom: fabBottom,
          elevation: 5,
        },
      ]}
    >
      <IconSymbol name="plus" size={24} color={ui.surface} />
    </Pressable>
  );
}
