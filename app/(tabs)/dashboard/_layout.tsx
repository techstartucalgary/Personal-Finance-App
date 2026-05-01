import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable } from "react-native";

import { useTabsTheme } from "@/constants/tabsTheme";

export default function IndexLayout() {
    const router = useRouter();
    const { colors } = useTabsTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerLargeTitle: Platform.OS === "ios",
                headerTransparent: Platform.OS === "ios",
                headerTitleAlign: "center",
                headerShadowVisible: false,
                headerStyle: { backgroundColor: Platform.OS === "android" ? colors.bg : "transparent" },
                headerLargeStyle: { backgroundColor: Platform.OS === "ios" ? "transparent" : colors.bg },
                headerTintColor: colors.text,
                headerTitleStyle: { color: colors.text },
                headerLargeTitleStyle: { color: colors.text },
                headerLeft: () => (
                    <Pressable
                        onPress={() => router.push("/notifications")}
                        hitSlop={10}
                        style={({ pressed }) => ({
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <Feather
                            name="bell"
                            size={24}
                            color={colors.text}
                        />
                    </Pressable>
                ),
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
                        <IconSymbol
                            size={24}
                            name="person"
                            color={colors.text}
                        />
                    </Pressable>
                ),
            }}
        >
            <Stack.Screen name="index" options={{ title: "Dashboard" }} />
        </Stack>
    );
}
