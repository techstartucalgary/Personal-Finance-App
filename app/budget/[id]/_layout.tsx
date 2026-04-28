import { Stack } from "expo-router";
import React from "react";

export default function BudgetLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="account-select" />
    </Stack>
  );
}
