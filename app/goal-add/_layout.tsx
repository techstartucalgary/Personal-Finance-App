import { Stack } from "expo-router";
import React from "react";

export default function GoalAddLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="account-select" />
    </Stack>
  );
}
