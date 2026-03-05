import { Stack, useRouter } from "expo-router";
import React from "react";
import { Platform, useColorScheme } from "react-native";

export default function TransactionsLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();

    return (
        <Stack
            screenOptions={{
                headerShown: Platform.OS === "ios",
                headerLargeTitle: true,
                headerTransparent: Platform.OS === "ios",
                headerShadowVisible: false,
                headerStyle: Platform.OS === "android" ? { backgroundColor: isDark ? "#000000" : "#ffffff" } : undefined,
                headerLargeStyle: {
                    backgroundColor: "transparent",
                },
            }}
        >
            <Stack.Screen name="index" options={{ title: "Transactions" }} />
        </Stack>
    );
}
