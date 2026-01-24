import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, useColorScheme } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { IconSymbol } from "@/components/ui/icon-symbol";

import { useRouter } from "expo-router";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const ui = useMemo(
    () => ({
      surface: isDark ? "#121212" : "#ffffff",
      surface2: isDark ? "#1a1a1a" : "#ffffff",
      border: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
      text: isDark ? "#ffffff" : "#111111",
      mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
      backdrop: "rgba(0,0,0,0.45)",
    }),
    [isDark]
  );

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: 16 + insets.top,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <ThemedText type="title">Goals</ThemedText>
        <Pressable onPress={() => router.push("/profile")}>
          <IconSymbol size={28} name="person" color={ui.text} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
