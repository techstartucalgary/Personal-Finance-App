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
        <View style={{ flex: 1, backgroundColor: isDark ? "#16181C" : "#ECECF1" }}>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
                <View style={[styles.bgOrb, styles.bgOrbTop, { backgroundColor: ui.accentSoft }]} />
                <View
                    style={[
                        styles.bgOrb,
                        styles.bgOrbBottom,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.65)" },
                    ]}
                />
                <View style={[styles.bgRing, { borderColor: ui.accentSoft }]} />
            </View>

            <Stack
                screenOptions={{
                    contentStyle: { backgroundColor: "transparent" },
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
        </View>
    );
}

const styles = StyleSheet.create({
    bgOrb: {
        position: "absolute",
        borderRadius: 999,
        opacity: 0.7,
    },
    bgOrbTop: {
        width: 260,
        height: 260,
        top: -140,
        right: -90,
    },
    bgOrbBottom: {
        width: 220,
        height: 220,
        bottom: -120,
        left: -70,
    },
    bgRing: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        borderWidth: 1,
        top: 180,
        right: -130,
        opacity: 0.35,
    },
});
