import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";

import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { getAccountById, listAccounts, updateAccount } from "@/utils/accounts";
import { listCategories } from "@/utils/categories";
import { deleteExpense, listExpenses } from "@/utils/expenses";
import {
  extractGoalTransactionGoalId,
  getGoalDeltaFromTransactionAmount,
} from "@/utils/goal-transactions";
import { updateGoalCurrentAmountByDelta } from "@/utils/goals";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import { getPlaidAccounts, getPlaidTransactions } from "@/utils/plaid";
import { deleteRecurringRule, getRecurringRules } from "@/utils/recurring";

import { TransactionsList } from "@/components/transactions/TransactionsList";
import { AccountFilterChips } from "@/components/transactions/tab/AccountFilterChips";
import { EditRecurrenceSheet } from "@/components/transactions/tab/EditRecurrenceSheet";
import { RecurringRulesList } from "@/components/transactions/tab/RecurringRulesList";
import { TransactionsFab } from "@/components/transactions/tab/TransactionsFab";
import { TransactionsSegmentedControl } from "@/components/transactions/tab/TransactionsSegmentedControl";
import { styles } from "@/components/transactions/tab/styles";
import type {
  AccountRow,
  CategoryRow,
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
  const isDark = ui.bg === "#000000";

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<
    PlaidTransaction[]
  >([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TransactionsTab>("transactions");
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
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

  const loadCategories = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      return;
    }

    try {
      const data = await listCategories({ profile_id: userId });
      setCategories((data as CategoryRow[]) ?? []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, [userId]);

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
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadExpenses();
    loadRecurringRules();
  }, [loadExpenses, loadRecurringRules]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts(true);
      loadCategories();
      loadExpenses();
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
      loadCategories,
      loadExpenses,
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
    loadCategories();
    loadExpenses();
    loadRecurringRules();
  }, [loadAccounts, loadCategories, loadExpenses, loadRecurringRules]);

  const handleModalRefresh = useCallback(async () => {
    await loadExpenses();
    await loadAccounts();
    await loadCategories();
    await loadRecurringRules();
  }, [loadAccounts, loadCategories, loadExpenses, loadRecurringRules]);

  const applyTransactionToBalance = useCallback(
    (account: AccountRow, transactionAmount: number) => {
      const currentBalance = account.balance ?? 0;
      const isCredit = account.account_type === "credit";
      return isCredit
        ? currentBalance + transactionAmount
        : currentBalance - transactionAmount;
    },
    [],
  );

  const handleDeleteTransaction = useCallback(
    async (expense: ExpenseRow) => {
      if (!userId) return;

      const executeDelete = async () => {
        if (!userId) return;
        try {
          const originalAmount = expense.amount ?? 0;
          const originalAccountId = expense.account_id;
          const linkedGoalId = extractGoalTransactionGoalId(expense.description);

          await deleteExpense({ id: expense.id, profile_id: userId });

          if (linkedGoalId) {
            await updateGoalCurrentAmountByDelta({
              id: linkedGoalId,
              profile_id: userId,
              delta: -getGoalDeltaFromTransactionAmount(originalAmount),
            });
          }

          if (originalAccountId != null) {
            const originalAccount = await getAccountById({
              id: originalAccountId,
              profile_id: userId,
            });
            if (originalAccount) {
              const revertedBalance = applyTransactionToBalance(
                originalAccount,
                -originalAmount,
              );
              await updateAccount({
                id: String(originalAccount.id),
                profile_id: userId,
                update: { balance: revertedBalance },
              });
            }
          }

          await handleModalRefresh();
        } catch (error) {
          console.error("Error deleting transaction:", error);
          Alert.alert("Error", "Could not delete transaction.");
        } finally {
          setIsLoading(false);
        }
      };

      if (expense.recurring_rule_id) {
        Alert.alert(
          "Recurring Transaction",
          "This transaction is part of a recurring series. What would you like to do?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete and Cancel Future Recurring",
              style: "destructive",
              onPress: async () => {
                setIsLoading(true);
                try {
                  await deleteRecurringRule({
                    id: expense.recurring_rule_id!,
                    profile_id: userId,
                  });
                  await executeDelete();
                } catch (error) {
                  console.error("Error updating rule:", error);
                  Alert.alert(
                    "Error",
                    "Could not cancel future recurring transactions.",
                  );
                  setIsLoading(false);
                }
              },
            },
            {
              text: "Delete This Transaction Only",
              style: "default",
              onPress: async () => {
                setIsLoading(true);
                await executeDelete();
              },
            },
          ],
        );
      } else {
        Alert.alert("Delete transaction?", "This action cannot be undone.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setIsLoading(true);
              await executeDelete();
            },
          },
        ]);
      }
    },
    [applyTransactionToBalance, handleModalRefresh, userId],
  );

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
            onEditRule={setEditingRule}
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

      <EditRecurrenceSheet
        editingRule={editingRule}
        onClose={() => setEditingRule(null)}
        ui={ui}
        isDark={isDark}
        insets={insets}
        userId={userId}
        categories={categories}
        onRefreshCategories={loadCategories}
        onRefreshRules={loadRecurringRules}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </>
  );
}
