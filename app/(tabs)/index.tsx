import Feather from "@expo/vector-icons/Feather";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, useColorScheme } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { Tokens } from "@/constants/authTokens";

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
        <Pressable style={styles.iconBtn} hitSlop={8}>
          <Feather name="bell" size={22} color={ui.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: ui.text }]}>
          Dashboard
        </ThemedText>
        <Pressable
          onPress={() => router.push("/profile")}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Feather name="user" size={22} color={ui.text} />
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
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 0.2,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
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
