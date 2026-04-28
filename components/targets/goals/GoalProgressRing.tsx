import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";

import type { GoalsUi } from "./types";

type GoalProgressRingProps = {
  progress: number;
  ui: GoalsUi;
  currentAmount: string;
  targetAmount: string;
};

export function GoalProgressRing({
  progress,
  ui,
  currentAmount,
  targetAmount,
}: GoalProgressRingProps) {
  const size = 184;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ui.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ui.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View
        style={{
          position: "absolute",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 22,
        }}
      >
        <ThemedText
          style={{
            color: ui.text,
            fontSize: 40,
            lineHeight: 42,
            fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
            fontVariant: ["tabular-nums"],
          }}
        >
          {Math.round(progress)}%
        </ThemedText>
        <ThemedText style={{ color: ui.mutedText, textAlign: "center", fontSize: 13 }}>
          {currentAmount}
          {"\n"}of {targetAmount}
        </ThemedText>
      </View>
    </View>
  );
}
