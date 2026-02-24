import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, StyleSheet, useColorScheme, View } from "react-native";

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
                    <View style={{ flexDirection: "row", gap: 6 }}>
                        <Pressable
                            hitSlop={10}
                            onPress={() => Alert.alert("Settings", "Settings coming soon!")}
                            style={({ pressed }) => ({
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <Feather name="settings" size={20} color={isDark ? "#ffffff" : "#111111"} />
                        </Pressable>
                        <Pressable
                            hitSlop={10}
                            onPress={() => Alert.alert("Notifications", "You have no new notifications.")}
                            style={({ pressed }) => ({
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <Feather name="bell" size={20} color={isDark ? "#ffffff" : "#111111"} />
                        </Pressable>
                    </View>
                ),
                headerRight: () => (
                    <Pressable
                        onPress={() => router.push("/profile")}
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
                        <IconSymbol size={25} name="person" color={isDark ? "#ffffff" : "#111111"} />
                    </Pressable>
                ),
            }}
        >
            <Stack.Screen name="index" options={{ title: "Accounts" }} />
        </Stack>
    );
}

const styles = StyleSheet.create({});
