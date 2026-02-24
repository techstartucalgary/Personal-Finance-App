import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from "react-native";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { IconSymbol } from "@/components/ui/icon-symbol";

import { BudgetsView } from "@/components/targets/BudgetsView";
import { GoalsView } from "@/components/targets/GoalsView";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listAccounts } from "@/utils/accounts";
import type { PlaidAccount } from "@/utils/plaid";
import { getPlaidAccounts } from "@/utils/plaid";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";

type Tab = "goals" | "budgets";

export default function TargetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const ui = useMemo(
    () => ({
      surface: isDark ? "#121212" : "#ffffff",
      surface2: isDark ? "#1e1e1e" : "#f5f5f5",
      border: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
      text: isDark ? "#ffffff" : "#111111",
      mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
      backdrop: "rgba(0,0,0,0.45)",
    }),
    [isDark]
  );

  // Dynamic tab bar height for FAB positioning
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = insets.bottom + 60;
  }
  const fabBottom = tabBarHeight + 60;

  const [activeTab, setActiveTab] = useState<Tab>("goals");
  const { session } = useAuthContext();
  const userId = session?.user.id;
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [filterAccountId, setFilterAccountId] = useState<string | number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createRequested, setCreateRequested] = useState(0);

  const loadAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await listAccounts({ profile_id: userId });
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  }, [userId]);

  const loadPlaidAccounts = useCallback(async () => {
    try {
      const data = await getPlaidAccounts();
      setPlaidAccounts(data || []);
    } catch (error) {
      console.error("Error loading Plaid accounts:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
      loadPlaidAccounts();
    }, [loadAccounts, loadPlaidAccounts])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAccounts();
    await loadPlaidAccounts();
    setRefreshKey((prev) => prev + 1);
    setIsRefreshing(false);
  }, [loadAccounts, loadPlaidAccounts]);

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: 16 + insets.top,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ui.text}
          />
        }
      >
        <View style={styles.headerRow}>
          <ThemedText type="title">Targets</ThemedText>
          <Pressable onPress={() => router.push("/profile")}>
            <IconSymbol size={28} name="person" color={ui.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.tabsContainer,
            { backgroundColor: ui.surface2, borderColor: ui.border },
          ]}
        >
          <Pressable
            onPress={() => { setActiveTab("goals"); setCreateRequested(0); }}
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
            onPress={() => { setActiveTab("budgets"); setCreateRequested(0); }}
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
          {plaidAccounts.map((pa) => {
            const chipId = `plaid:${pa.account_id}`;
            const isSelected = filterAccountId === chipId;
            return (
              <Pressable
                key={chipId}
                onPress={() => setFilterAccountId(chipId)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? (isDark ? "#8CF2D1" : "#1F6F5B")
                      : ui.surface2,
                    borderColor: isSelected
                      ? "transparent"
                      : (isDark ? "rgba(140,242,209,0.2)" : "rgba(31,111,91,0.15)"),
                  },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isSelected ? "#FFFFFF" : (isDark ? "#8CF2D1" : "#1F6F5B"),
                  }}
                >
                  {pa.name}{pa.mask ? ` ••${pa.mask}` : ""}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === "goals" ? (
          <GoalsView filterAccountId={filterAccountId} refreshKey={refreshKey} createRequested={createRequested} />
        ) : (
          <BudgetsView filterAccountId={filterAccountId} refreshKey={refreshKey} createRequested={createRequested} />
        )}
      </ScrollView>

      {/* FAB - outside ScrollView for fixed positioning */}
      <Pressable
        onPress={() => setCreateRequested((prev) => prev + 1)}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: ui.text,
            opacity: pressed ? 0.8 : 1,
            bottom: fabBottom,
          },
        ]}
      >
        <IconSymbol name="plus" size={32} color={ui.surface} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 24,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeTab: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
});
