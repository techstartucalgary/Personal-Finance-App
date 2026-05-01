import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";

import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listAccounts } from "@/utils/accounts";
import { listExpenses } from "@/utils/expenses";
import { listGoals } from "@/utils/goals";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import { getPlaidAccounts, getPlaidTransactions } from "@/utils/plaid";
import { getRecurringRules } from "@/utils/recurring";

import { TransactionsList } from "@/components/transactions/TransactionsList";
import { AccountFilterChips } from "@/components/transactions/tab/AccountFilterChips";
import { RecurringRulesList } from "@/components/transactions/tab/RecurringRulesList";
import { TransactionsFab } from "@/components/transactions/tab/TransactionsFab";
import { TransactionsSegmentedControl } from "@/components/transactions/tab/TransactionsSegmentedControl";
import { styles } from "@/components/transactions/tab/styles";
import type {
  AccountRow,
  ExpenseRow,
  FilterAccountId,
  RecurringRule,
  TransactionsTab,
} from "@/components/transactions/tab/types";

export default function HomeScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";

  // Dynamic tab bar height (NativeTabs-safe)
  const tabBarHeight = insets.bottom + 48;
  const fabBottom = tabBarHeight + 2;

  // Keep tab screens on the auth palette for a more consistent app shell.
  const { ui } = useTabsTheme();

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [goals, setGoals] = useState<{ id: string | number; name?: string | null }[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<
    PlaidTransaction[]
  >([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TransactionsTab>("transactions");
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [filterAccountId, setFilterAccountId] = useState<FilterAccountId>(null);

  // Formatters shared across list rows and detail views.
  const formatDate = useCallback((value?: string | null) => {
    if (!value) return "";
    // Parse YYYY-MM-DD as local time to avoid UTC midnight timezone shift.
    const parts = value.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const local = new Date(y, m - 1, d);
      if (!Number.isNaN(local.getTime())) {
        return local.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatMoney = useCallback((value?: number | null) => {
    if (value == null) return "0.00";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(value);
  }, []);

  const loadAccounts = useCallback(
    async (silent = false) => {
      if (!userId) {
        setAccounts([]);
        return;
      }

      if (!silent) setIsLoading(true);
      try {
        const data = await listAccounts({ profile_id: userId });
        setAccounts((data as AccountRow[]) ?? []);
      } catch (error) {
        console.error("Error loading accounts:", error);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [userId],
  );

  const loadExpenses = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      return;
    }

    try {
      const data = await listExpenses({ profile_id: userId });
      setExpenses((data as ExpenseRow[]) ?? []);
    } catch (error) {
      console.error("Error loading expenses:", error);
    }
  }, [userId]);

  const loadGoals = useCallback(async () => {
    if (!userId) {
      setGoals([]);
      return;
    }

    try {
      const data = await listGoals({ profile_id: userId });
      setGoals((data as { id: string | number; name?: string | null }[]) ?? []);
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  }, [userId]);

  const loadRecurringRules = useCallback(async () => {
    if (!userId) {
      setRecurringRules([]);
      return;
    }
    try {
      const data = await getRecurringRules({ profile_id: userId });
      setRecurringRules((data as RecurringRule[]) ?? []);
    } catch (error) {
      console.error("Error loading recurring rules:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadExpenses();
    loadGoals();
    loadRecurringRules();
  }, [loadExpenses, loadGoals, loadRecurringRules]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts(true);
      loadExpenses();
      loadGoals();
      loadRecurringRules();
      // Also load Plaid transactions and accounts.
      if (userId) {
        getPlaidTransactions()
          .then(setPlaidTransactions)
          .catch((err: any) =>
            console.error("Error loading Plaid transactions:", err),
          );
        getPlaidAccounts()
          .then(setPlaidAccounts)
          .catch((err: any) =>
            console.error("Error loading Plaid accounts:", err),
          );
      }
    }, [
      loadAccounts,
      loadExpenses,
      loadGoals,
      loadRecurringRules,
      userId,
    ]),
  );

  // iOS header search configuration.
  const headerSearchBarOptions = useMemo(
    () => ({
      placeholder: "Search transactions...",
      onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
      hideWhenScrolling: true,
      tintColor: ui.text,
      textColor: ui.text,
      hintTextColor: ui.mutedText,
      headerIconColor: ui.mutedText,
    }),
    [setSearchQuery, ui.mutedText, ui.text],
  );

  const handleRefreshAll = useCallback(() => {
    loadAccounts();
    loadExpenses();
    loadGoals();
    loadRecurringRules();
  }, [loadAccounts, loadExpenses, loadGoals, loadRecurringRules]);

  const handleSelectTransaction = useCallback(
    (transaction: ExpenseRow | PlaidTransaction) => {
      const initialData = encodeURIComponent(JSON.stringify(transaction));
      if ("transaction_id" in transaction) {
        router.push({
          pathname: "/transaction-detail/[id]",
          params: { id: transaction.transaction_id, initialData }
        });
        return;
      }

      router.push({
        pathname: "/transaction/[id]",
        params: { id: String(transaction.id), initialData }
      });
    },
    [router],
  );

  return (
    <>
      <Stack.Screen options={{ headerSearchBarOptions }} />
      <ScrollView
        style={[styles.container, { backgroundColor: ui.bg }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 120, paddingTop: Platform.OS === "android" ? 16 : 0 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefreshAll}
            tintColor={ui.text}
          />
        }
      >
        <TransactionsSegmentedControl
          activeTab={activeTab}
          onChange={setActiveTab}
          ui={ui}
          tintColor={ui.accent}
          backgroundColor={ui.surface2}
        />

        <AccountFilterChips
          accounts={accounts}
          plaidAccounts={plaidAccounts}
          filterAccountId={filterAccountId}
          onSelect={setFilterAccountId}
          ui={ui}
        />

        {activeTab === "transactions" ? (
          <TransactionsList
            accounts={accounts}
            goals={goals}
            expenses={expenses}
            plaidTransactions={plaidTransactions}
            recurringRules={recurringRules}
            plaidAccounts={plaidAccounts}
            filterAccountId={filterAccountId}
            onFilterAccountChange={setFilterAccountId}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            isLoading={isLoading}
            onSelectTransaction={handleSelectTransaction}
            ui={ui}
            showSearch={false}
            showFilters={false}
            showMeta={false}
            showBadges={false}
            subtleAmountColors
          />
        ) : (
          <RecurringRulesList
            recurringRules={recurringRules}
            filterAccountId={filterAccountId}
            searchQuery={searchQuery}
            isLoading={isLoading}
            onEditRule={(rule) => {
              router.push({
                pathname: "/recurrence/[id]",
                params: {
                  id: String(rule.id),
                  initialData: encodeURIComponent(JSON.stringify(rule)),
                },
              });
            }}
            ui={ui}
            formatDate={formatDate}
            formatMoney={formatMoney}
          />
        )}
      </ScrollView>

      <TransactionsFab
        onPress={() => {
          router.push("/transaction-add");
        }}
        bottom={fabBottom}
        ui={ui}
        isAndroid={isAndroid}
      />

      {/* TransactionsModals removed in favor of native routing */}
    </>
  );
}
