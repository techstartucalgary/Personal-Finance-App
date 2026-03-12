import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, useColorScheme, View } from "react-native";

export default function IndexLayout() {
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
                headerStyle: Platform.OS === "android" ? { backgroundColor: "transparent" } : undefined,
                headerLargeStyle: {
                    backgroundColor: "transparent",
                },
                headerLeft: () => (
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
                        <IconSymbol size={25} name="person" color={isDark ? "#ffffff" : "#111111"} />
                    </Pressable>
                ),
                headerRight: () => (
                    <View style={{ flexDirection: "row", gap: 16 }}>
                        <Pressable
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
                            <Feather name="settings" size={24} color={isDark ? "#ffffff" : "#111111"} />
                        </Pressable>
                        <Pressable
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
                            <Feather name="bell" size={24} color={isDark ? "#ffffff" : "#111111"} />
                        </Pressable>
                    </View>
                ),
            }}
        >
            <Stack.Screen name="index" options={{ title: "Dashboard" }} />
        </Stack>
    );
}
