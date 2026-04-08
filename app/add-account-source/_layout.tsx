import { Stack } from "expo-router";
import React from "react";

export default function AddAccountSourceLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="manual" />
      <Stack.Screen name="account-type" />
    </Stack>
  );
}
