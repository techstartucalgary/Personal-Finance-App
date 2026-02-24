import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Pressable, useColorScheme, View } from "react-native";

export default function AccountsLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();

    return (
        <Stack
            screenOptions={{
                headerLargeTitle: true,
                headerTransparent: true,
                headerShadowVisible: false,
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
