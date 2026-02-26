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
    [isDark],
  );

  const [activeTab, setActiveTab] = useState<Tab>("goals");
  const { session } = useAuthContext();
  const userId = session?.user.id;
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await listAccounts({ profile_id: userId });
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts]),
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
        style={{ flexGrow: 0 }}
      >
        <Pressable
          onPress={() => setFilterAccountId(null)}
          style={[
            styles.chip,
            {
              backgroundColor: filterAccountId === null ? ui.text : ui.surface2,
              borderColor: ui.border,
            },
          ]}
        >
          <ThemedText
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: filterAccountId === null ? ui.surface : ui.text,
            }}
          >
            All
          </ThemedText>
        </Pressable>
        {accounts.map((acct) => (
          <Pressable
            key={acct.id}
            onPress={() => setFilterAccountId(acct.id)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  filterAccountId === acct.id ? ui.text : ui.surface2,
                borderColor: ui.border,
              },
            ]}
          >
            <ThemedText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: filterAccountId === acct.id ? ui.surface : ui.text,
              }}
            >
              {acct.account_name ?? "Account"}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {activeTab === "goals" ? (
          <GoalsView filterAccountId={filterAccountId} />
        ) : (
          <BudgetsView filterAccountId={filterAccountId} />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
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
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
