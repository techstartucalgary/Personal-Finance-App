import SegmentedControl from "@react-native-segmented-control/segmented-control";
import React from "react";

import { Platform } from "react-native";
import type { GoalSegment, GoalsUi } from "./types";

type GoalSegmentedControlProps = {
  activeTab: GoalSegment;
  onChange: (nextTab: GoalSegment) => void;
  ui: GoalsUi;
};

export function GoalSegmentedControl({
  activeTab,
  onChange,
  ui,
}: GoalSegmentedControlProps) {
  return (
    <SegmentedControl
      values={["Activity", "Active", "Reached"]}
      selectedIndex={
        activeTab === "activity" ? 0 : activeTab === "active" ? 1 : 2
      }
      onChange={(event) => {
        const index = event.nativeEvent.selectedSegmentIndex;
        onChange(index === 0 ? "activity" : index === 1 ? "active" : "reached");
      }}
      tintColor={ui.accent}
      backgroundColor={Platform.OS === "ios" ? "transparent" : ui.surface2}
      fontStyle={{ color: ui.text, fontWeight: "500" }}
      activeFontStyle={{ color: ui.surface, fontWeight: "600" }}
    />
  );
}
