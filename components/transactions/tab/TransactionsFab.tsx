import React from "react";
import { NativeFab } from "@/components/ui/native-fab";

import type { TransactionsUi } from "./types";

type TransactionsFabProps = {
  onPress: () => void;
  bottom: number;
  ui: TransactionsUi;
  isAndroid: boolean;
};

// Floating action button for adding a new transaction.
export function TransactionsFab({
  onPress,
  bottom,
  ui,
  isAndroid,
}: TransactionsFabProps) {
  void ui;
  void isAndroid;
  return (
    <NativeFab
      accessibilityLabel="Add transaction"
      bottom={bottom}
      onPress={onPress}
    />
  );
}
