import { Stack, useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, useColorScheme } from "react-native";
import { useTheme } from "react-native-paper";

export default function AccountsLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();
    const theme = useTheme();

    const ui = {
        accentSoft: isDark ? "rgba(140,242,209,0.12)" : "rgba(31,111,91,0.08)",
    };

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerLargeTitle: true,
                headerTransparent: Platform.OS === "ios",
                headerShadowVisible: false,
                headerStyle: Platform.OS === "android" ? { backgroundColor: isDark ? theme.colors.surface : theme.colors.surfaceVariant } : undefined,
                headerLargeStyle: {
                    backgroundColor: "transparent",
                },
            }}
        >
            <Stack.Screen name="index" options={{ title: "Accounts" }} />
        </Stack>
    );
}

const styles = StyleSheet.create({});
