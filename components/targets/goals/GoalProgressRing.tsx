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
  const svgSize = size + 18;
  const center = svgSize / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const isComplete = clampedProgress >= 99.5;
  const dashOffset = circumference - (clampedProgress / 100) * circumference;
  const ringGreen = "#30D158";

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={svgSize} height={svgSize}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ui.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {isComplete ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringGreen}
            strokeWidth={strokeWidth}
            fill="none"
          />
        ) : (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringGreen}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            fill="none"
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        )}
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
