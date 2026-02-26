import Feather from "@expo/vector-icons/Feather";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useColorScheme } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { BudgetsView } from "@/components/targets/BudgetsView";
import { GoalsView } from "@/components/targets/GoalsView";
import { Tokens } from "@/constants/authTokens";
import { useRouter } from "expo-router";

type Tab = "goals" | "budgets";

export default function TargetsScreen() {
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

  const [activeTab, setActiveTab] = useState<Tab>("goals");

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
          Targets
        </ThemedText>
        <Pressable
          onPress={() => router.push("/profile")}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Feather name="user" size={22} color={ui.text} />
        </Pressable>
      </View>

      <View
        style={[
          styles.tabsContainer,
          { backgroundColor: ui.surface2, borderColor: ui.border },
        ]}
      >
        <Pressable
          onPress={() => setActiveTab("goals")}
          style={[
            styles.tab,
            activeTab === "goals" && {
              backgroundColor: ui.surface,
              borderColor: ui.border,
            },
            activeTab === "goals" && styles.activeTab,
          ]}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ opacity: activeTab === "goals" ? 1 : 0.6 }}
          >
            Goals
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("budgets")}
          style={[
            styles.tab,
            activeTab === "budgets" && {
              backgroundColor: ui.surface,
              borderColor: ui.border,
            },
            activeTab === "budgets" && styles.activeTab,
          ]}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ opacity: activeTab === "budgets" ? 1 : 0.6 }}
          >
            Budgets
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.content}>
        {activeTab === "goals" ? <GoalsView /> : <BudgetsView />}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
  },
});
