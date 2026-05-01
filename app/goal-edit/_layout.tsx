import { Stack } from "expo-router";
import React from "react";

export default function GoalEditLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="account-select" />
    </Stack>
  );
}
