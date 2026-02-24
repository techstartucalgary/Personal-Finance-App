import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, useColorScheme, View } from "react-native";

export default function AccountsLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();

    const ui = {
        accentSoft: isDark ? "rgba(140,242,209,0.12)" : "rgba(31,111,91,0.08)",
    };

    return (
        <Stack
            screenOptions={{
                contentStyle: { backgroundColor: isDark ? "#16181C" : "#ECECF1" },
                headerLargeTitle: true,
                headerTransparent: Platform.OS === "ios",
                headerShadowVisible: false,
                headerStyle: Platform.OS === "android" ? { backgroundColor: isDark ? "#16181C" : "#ECECF1" } : undefined,
                headerLargeStyle: {
                    backgroundColor: "transparent",
                },
                headerLeft: () => (
                    <View style={{ flexDirection: "row", gap: 16, marginLeft: -8 }}>
                        <Pressable hitSlop={10}>
                            <Feather name="menu" size={26} color={isDark ? "#ffffff" : "#111111"} />
                        </Pressable>
                        <Pressable hitSlop={10}>
                            <Feather name="bell" size={24} color={isDark ? "#ffffff" : "#111111"} />
                        </Pressable>
                    </View>
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
                        <IconSymbol size={22} name="person.fill" color={isDark ? "#ffffff" : "#111111"} />
                    </Pressable>
                ),
            }}
        >
            <Stack.Screen name="index" options={{ title: "Accounts" }} />
        </Stack>
    );
}

const styles = StyleSheet.create({});
