import { IconSymbol } from "@/components/ui/icon-symbol";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, useColorScheme } from "react-native";

export default function TargetsLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();

    return (
        <Stack
            screenOptions={{
                headerLargeTitle: true,
                headerTransparent: Platform.OS === "ios",
                headerShadowVisible: false,
                headerStyle: Platform.OS === "android" ? { backgroundColor: isDark ? "#000000" : "#ffffff" } : undefined,
                headerLargeStyle: {
                    backgroundColor: "transparent",
                },
                headerRight: () => (
                    <Pressable
                        onPress={() => router.push("/profile")}
                        hitSlop={10}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <IconSymbol size={22} name="person.fill" color={isDark ? "#ffffff" : "#111111"} />
                    </Pressable>
                ),
            }}
        >
            <Stack.Screen name="index" options={{ title: "Targets" }} />
        </Stack>
    );
}
