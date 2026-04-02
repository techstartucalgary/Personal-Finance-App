import { Stack } from "expo-router";
import React from "react";
import { Platform, useColorScheme } from "react-native";
import { useTheme } from "react-native-paper";

export default function AccountsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: Platform.OS === "ios",
        headerTransparent: Platform.OS === "ios",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: Platform.OS === "android" ? (isDark ? theme.colors.surface : theme.colors.surfaceVariant) : "transparent" },
        headerLargeStyle: { backgroundColor: Platform.OS === "ios" ? "transparent" : (isDark ? theme.colors.surface : theme.colors.surfaceVariant) },
        headerTitleStyle: { color: isDark ? "#ffffff" : "#111111" },
        headerLargeTitleStyle: { color: isDark ? "#ffffff" : "#111111" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Accounts" }} />
    </Stack>
  );
}
