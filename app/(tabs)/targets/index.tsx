import React, { useMemo, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, useColorScheme } from "react-native";

import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Appbar, Searchbar, useTheme } from "react-native-paper";

import { IconSymbol } from "@/components/ui/icon-symbol";

import { BudgetsView } from "@/components/targets/BudgetsView";
import { GoalsView } from "@/components/targets/GoalsView";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listAccounts } from "@/utils/accounts";
import type { PlaidAccount } from "@/utils/plaid";
import { getPlaidAccounts } from "@/utils/plaid";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback } from "react";

type Tab = "goals" | "budgets";

export default function TargetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useTheme();

  const isAndroid = Platform.OS === "android";

  const ui = useMemo(
    () => ({
      surface: isAndroid ? theme.colors.surface : (isDark ? "#1C1C1E" : "#F5F5F5"), // neutral gray
      surface2: isAndroid ? theme.colors.elevation.level2 : (isDark ? "#2C2C2E" : "#EBEBEB"), // slightly darker gray for inputs
      border: isAndroid ? theme.colors.outlineVariant : (isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)"),
      text: isDark ? "#FFFFFF" : "#000000",
      mutedText: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
      backdrop: "rgba(0,0,0,0.45)",
    }),
    [isDark, theme, isAndroid]
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isAndroidSearching, setIsAndroidSearching] = useState(false);
  const navigation = useNavigation();

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

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: "Search targets...",
          onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
          hideWhenScrolling: true,
          tintColor: ui.text,
          textColor: ui.text,
        },
      });
    }, [navigation, ui])
  );

  return (
    <>
      {Platform.OS === "android" && (
        isAndroidSearching ? (
          <Appbar.Header mode="small" elevated>
            <Searchbar
              placeholder="Search targets..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              onBlur={() => {
                if (!searchQuery.trim()) {
                  setIsAndroidSearching(false);
                }
              }}
              onIconPress={() => { setSearchQuery(""); setIsAndroidSearching(false); }}
              icon="arrow-left"
              style={{ flex: 1, marginHorizontal: 4, backgroundColor: theme.colors.elevation.level4 }}
              inputStyle={{ color: theme.colors.onSurface }}
              iconColor={theme.colors.onSurface}
            />
          </Appbar.Header>
        ) : (
          <Appbar.Header mode="small" elevated>
            <Appbar.Content
              title="Targets"
              titleStyle={{ fontWeight: "bold" }}
            />
            <Appbar.Action
              icon="magnify"
              onPress={() => setIsAndroidSearching(true)}
            />
          </Appbar.Header>
        )
      )}

      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 120, paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ui.text}
          />
        }
      >

        {/* Native Segmented Control */}
        <SegmentedControl
          values={["Goals", "Budgets"]}
          selectedIndex={activeTab === "goals" ? 0 : 1}
          onChange={(event) => {
            const index = event.nativeEvent.selectedSegmentIndex;
            setActiveTab(index === 0 ? "goals" : "budgets");
            setCreateRequested(0);
          }}
          tintColor={isAndroid ? theme.colors.surface : (isDark ? "#3A3A3C" : "#FFFFFF")}
          backgroundColor={isAndroid ? theme.colors.elevation.level2 : "transparent"}
          fontStyle={{ color: ui.text, fontWeight: "500" }}
          activeFontStyle={{ color: ui.text, fontWeight: "600" }}
        />

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
                backgroundColor: filterAccountId === null ? (isAndroid ? theme.colors.tertiary : ui.text) : ui.surface2,
                borderColor: ui.border,
              },
            ]}
          >
            <ThemedText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: filterAccountId === null ? (isAndroid ? theme.colors.onTertiary : ui.surface) : ui.text,
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
                    filterAccountId === acct.id ? (isAndroid ? theme.colors.tertiary : ui.text) : ui.surface2,
                  borderColor: ui.border,
                },
              ]}
            >
              <ThemedText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: filterAccountId === acct.id ? (isAndroid ? theme.colors.onTertiary : ui.surface) : ui.text,
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
                      ? (isAndroid ? theme.colors.tertiary : (isDark ? "#8CF2D1" : "#1F6F5B"))
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
                    color: isSelected ? (isAndroid ? theme.colors.onTertiary : "#FFFFFF") : (isDark ? "#8CF2D1" : "#1F6F5B"),
                  }}
                >
                  {pa.name}{pa.mask ? ` ••${pa.mask}` : ""}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === "goals" ? (
          <GoalsView filterAccountId={filterAccountId} refreshKey={refreshKey} createRequested={createRequested} searchQuery={searchQuery} />
        ) : (
          <BudgetsView filterAccountId={filterAccountId} refreshKey={refreshKey} createRequested={createRequested} searchQuery={searchQuery} />
        )}
      </ScrollView>

      {/* FAB - outside ScrollView for fixed positioning */}
      <Pressable
        onPress={() => setCreateRequested(Date.now())}
        style={({ pressed }) => [
          styles.fab,
          isAndroid && {
            width: 80,
            height: 80,
            borderRadius: 20,
            right: 16,
          },
          {
            backgroundColor: isAndroid ? theme.colors.primary : ui.text,
            opacity: pressed ? 0.8 : 1,
            bottom: fabBottom,
            elevation: isAndroid ? 5 : 6,
          },
        ]}
      >
        <IconSymbol name="plus" size={isAndroid ? 36 : 32} color={isAndroid ? theme.colors.surfaceVariant : ui.surface} />
      </Pressable>
    </>
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
