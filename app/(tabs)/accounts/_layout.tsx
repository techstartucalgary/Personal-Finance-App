import { Stack } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { useTabsTheme } from "@/constants/tabsTheme";

export default function AccountsLayout() {
  const { colors } = useTabsTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: Platform.OS === "ios",
        headerTitleAlign: "center",
        headerTransparent: Platform.OS === "ios",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: Platform.OS === "android" ? colors.bg : "transparent" },
        headerLargeStyle: { backgroundColor: Platform.OS === "ios" ? "transparent" : colors.bg },
        headerTitleStyle: { color: colors.text },
        headerLargeTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Accounts", headerBackTitle: "" }} />
    </Stack>
  );
}
