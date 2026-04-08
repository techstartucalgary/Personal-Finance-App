import { Stack } from "expo-router";
import React from "react";

export default function TransactionAddLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="account-select" />
    </Stack>
  );
}
