import React from "react";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

import type { TransactionsTab, TransactionsUi } from "../types";

type TransactionsSegmentedControlProps = {
  activeTab: TransactionsTab;
  onChange: (nextTab: TransactionsTab) => void;
  ui: TransactionsUi;
  tintColor: string;
  backgroundColor: string;
};

// Top-level toggle between one-off transactions and recurring rules.
export function TransactionsSegmentedControl({
  activeTab,
  onChange,
  ui,
  tintColor,
  backgroundColor,
}: TransactionsSegmentedControlProps) {
  return (
    <SegmentedControl
      values={["Transactions", "Recurring"]}
      selectedIndex={activeTab === "transactions" ? 0 : 1}
      onChange={(event) => {
        const index = event.nativeEvent.selectedSegmentIndex;
        onChange(index === 0 ? "transactions" : "recurrences");
      }}
      tintColor={tintColor}
      backgroundColor={backgroundColor}
      fontStyle={{ color: ui.text, fontWeight: "500" }}
      activeFontStyle={{ color: ui.text, fontWeight: "600" }}
    />
  );
}
