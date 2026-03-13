import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, useColorScheme } from "react-native";
import { useTheme } from "react-native-paper";

export default function IndexLayout() {
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
                headerLeft: () => (
                    <Pressable
                        onPress={() => Alert.alert("Notifications", "You have no new notifications.")}
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
                        <IconSymbol size={24} name="person" color={isDark ? "#ffffff" : "#111111"} />
                    </Pressable>
                ),
            }}
        >
            <Stack.Screen name="index" options={{ title: "Dashboard" }} />
        </Stack>
    );
}
