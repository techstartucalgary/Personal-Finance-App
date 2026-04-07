import React from "react";
import { NativeFab } from "@/components/ui/native-fab";
import { tabsTheme } from "@/constants/tabsTheme";

type Ui = typeof tabsTheme.ui;

type AccountsFabProps = {
  ui: Ui;
  fabBottom: number;
  onPress: () => void;
};

// Floating action button for the "add account" primary action.
export function AccountsFab({ ui, fabBottom, onPress }: AccountsFabProps) {
  void ui;
  return <NativeFab accessibilityLabel="Add account" bottom={fabBottom} onPress={onPress} />;
}
