import React from "react";
import { Pressable } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";

import { styles } from "../styles";
import type { TransactionsUi } from "../types";

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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          width: 80,
          height: 80,
          borderRadius: 20,
          right: 16,
        },
        {
          backgroundColor: ui.text,
          opacity: pressed ? 0.8 : 1,
          bottom,
          elevation: isAndroid ? 5 : 6,
        },
      ]}
    >
      <IconSymbol name="plus" size={32} color={ui.surface} />
    </Pressable>
  );
}
