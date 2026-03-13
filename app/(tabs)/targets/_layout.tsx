import { Stack, useRouter } from "expo-router";
import React from "react";
import { Platform, useColorScheme } from "react-native";
import { useTheme } from "react-native-paper";

export default function TargetsLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();
    const theme = useTheme();

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
            <Stack.Screen name="index" options={{ title: "Targets" }} />
        </Stack>
    );
}
