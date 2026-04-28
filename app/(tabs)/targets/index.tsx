import React, { useEffect, useMemo, useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountFilterChips } from "@/components/transactions/tab/AccountFilterChips";
import { NativeFab } from "@/components/ui/native-fab";
import { BudgetsView } from "@/components/targets/BudgetsView";
import { GoalsView } from "@/components/targets/GoalsView";
import { tabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listAccounts } from "@/utils/accounts";
import { getPlaidAccounts, type PlaidAccount } from "@/utils/plaid";

import { useCallback } from "react";

type Tab = "goals" | "budgets";

export default function TargetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ui = tabsTheme.ui;

  const tabBarHeight = insets.bottom + 48;
  const fabBottom = tabBarHeight + 2;

  const [activeTab, setActiveTab] = useState<Tab>("goals");
  const { session } = useAuthContext();
  const userId = session?.user.id;
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [filterAccountId, setFilterAccountId] = useState<string | number | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createRequested, setCreateRequested] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

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
    }, [loadAccounts, loadPlaidAccounts]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAccounts();
    await loadPlaidAccounts();
    setRefreshKey((prev) => prev + 1);
    setIsRefreshing(false);
  }, [loadAccounts, loadPlaidAccounts]);

  const headerSearchBarOptions = useMemo(
    () => ({
      placeholder: activeTab === "goals" ? "Search goals..." : "Search budgets...",
      onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
      hideWhenScrolling: true,
      tintColor: ui.text,
      textColor: ui.text,
      hintTextColor: ui.mutedText,
      headerIconColor: ui.mutedText,
    }),
    [activeTab, ui.mutedText, ui.text],
  );

  useEffect(() => {
    setSearchQuery("");
  }, [activeTab]);

  return (
    <>
      <Stack.Screen
        options={{
          title: activeTab === "goals" ? "Goals" : "Budgets",
          headerSearchBarOptions,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: ui.bg }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: tabBarHeight + 120,
            paddingTop: Platform.OS === "android" ? 16 : 0,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ui.text}
          />
        }
      >
        <SegmentedControl
          values={["Goals", "Budgets"]}
          selectedIndex={activeTab === "goals" ? 0 : 1}
          onChange={(event) => {
            const index = event.nativeEvent.selectedSegmentIndex;
            setActiveTab(index === 0 ? "goals" : "budgets");
            setCreateRequested(0);
          }}
          tintColor={ui.accent}
          backgroundColor={ui.surface2}
          fontStyle={{ color: ui.text, fontWeight: "500" }}
          activeFontStyle={{ color: ui.surface, fontWeight: "600" }}
        />

        <AccountFilterChips
          accounts={accounts}
          plaidAccounts={plaidAccounts}
          filterAccountId={filterAccountId}
          onSelect={setFilterAccountId}
          ui={ui}
        />

        <View style={{ flex: 1 }}>
          <View style={{ display: activeTab === "goals" ? "flex" : "none" }}>
            <GoalsView
              accounts={accounts}
              plaidAccounts={plaidAccounts}
              filterAccountId={filterAccountId}
              refreshKey={refreshKey}
              searchQuery={searchQuery}
            />
          </View>

          <View style={{ display: activeTab === "budgets" ? "flex" : "none" }}>
            <BudgetsView
              filterAccountId={filterAccountId}
              refreshKey={refreshKey}
              createRequested={createRequested}
              searchQuery={searchQuery}
            />
          </View>
        </View>
      </ScrollView>

      <NativeFab
        accessibilityLabel={activeTab === "goals" ? "Add goal" : "Add budget"}
        bottom={fabBottom}
        onPress={() => {
          if (activeTab === "goals") {
            router.push("/goal-add" as any);
            return;
          }

          setCreateRequested(Date.now());
        }}
      />
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
});
