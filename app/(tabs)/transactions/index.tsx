import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  useColorScheme,
} from "react-native";

import { Stack, useFocusEffect } from "expo-router";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthContext } from "@/hooks/use-auth-context";
import { getAccountById, listAccounts, updateAccount } from "@/utils/accounts";
import { listCategories } from "@/utils/categories";
import { deleteExpense, listExpenses } from "@/utils/expenses";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import { getPlaidAccounts, getPlaidTransactions } from "@/utils/plaid";
import { deleteRecurringRule, getRecurringRules } from "@/utils/recurring";

import { AccountFilterChips } from "@/components/transactions/tab/AccountFilterChips";
import { EditRecurrenceSheet } from "@/components/transactions/tab/EditRecurrenceSheet";
import { RecurringRulesList } from "@/components/transactions/tab/RecurringRulesList";
import { TransactionsFab } from "@/components/transactions/tab/TransactionsFab";
import { TransactionsList } from "@/components/transactions/tab/TransactionsList";
import { TransactionsModals } from "@/components/transactions/tab/TransactionsModals";
import { TransactionsSegmentedControl } from "@/components/transactions/tab/TransactionsSegmentedControl";
import { styles } from "@/components/transactions/tab/styles";
import type {
  AccountRow,
  CategoryRow,
  ExpenseRow,
  FilterAccountId,
  RecurringRule,
  TransactionsTab,
  TransactionsUi,
} from "@/components/transactions/tab/types";

export default function HomeScreen() {
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isAndroid = Platform.OS === "android";

  // Dynamic tab bar height (NativeTabs-safe)
  const tabBarHeight = insets.bottom + 60;
  const fabBottom = isAndroid ? tabBarHeight + 35 : tabBarHeight + 5;

  // Shared UI palette derived from the active theme.
  const ui: TransactionsUi = useMemo(
    () => ({
      surface: isDark ? "#1C1C1E" : "#FFFFFF",
      surface2: isDark ? "#2C2C2E" : "#F2F2F7",
      border: isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)",
      text: isDark ? "#FFFFFF" : "#000000",
      mutedText: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
      backdrop: "rgba(0,0,0,0.45)",
      accent: isDark ? "#8CF2D1" : "#1F6F5B",
      accentSoft: isDark ? "rgba(140,242,209,0.2)" : "rgba(31,111,91,0.12)",
      danger: "#D32F2F",
    }),
    [isDark],
  );

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

  const [transactionFormMode, setTransactionFormMode] = useState<
    "add" | "view" | "edit" | null
  >(null);
  const [transactionFormExpense, setTransactionFormExpense] =
    useState<ExpenseRow | null>(null);
  const [selectedPlaidTransaction, setSelectedPlaidTransaction] =
    useState<PlaidTransaction | null>(null);
  const [isPlaidDetailVisible, setIsPlaidDetailVisible] = useState(false);

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
      hideWhenScrolling: false,
      tintColor: ui.text,
      textColor: ui.text,
      hintTextColor: ui.mutedText,
      headerIconColor: ui.mutedText,
      placement: "inline" as const,
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

          await deleteExpense({ id: expense.id, profile_id: userId });

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
          setTransactionFormMode(null);
          setTransactionFormExpense(null);
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
      if ("transaction_id" in transaction) {
        setSelectedPlaidTransaction(transaction);
        setIsPlaidDetailVisible(true);
        return;
      }

      setTransactionFormExpense(transaction);
      setTransactionFormMode("view");
    },
    [],
  );

  return (
    <>
      <Stack.Screen options={{ headerSearchBarOptions }} />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
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
          tintColor={
            isAndroid ? theme.colors.background : isDark ? "#3A3A3C" : "#FFFFFF"
          }
          backgroundColor={isAndroid ? theme.colors.surface : "transparent"}
        />

        <AccountFilterChips
          accounts={accounts}
          plaidAccounts={plaidAccounts}
          filterAccountId={filterAccountId}
          onSelect={setFilterAccountId}
          ui={ui}
          isAndroid={isAndroid}
          isDark={isDark}
          androidSelectedBg={theme.colors.tertiary}
          androidSelectedText={theme.colors.onTertiary}
        />

        {activeTab === "transactions" ? (
          <TransactionsList
            expenses={expenses}
            plaidTransactions={plaidTransactions}
            recurringRules={recurringRules}
            filterAccountId={filterAccountId}
            searchQuery={searchQuery}
            isLoading={isLoading}
            onSelectTransaction={handleSelectTransaction}
            ui={ui}
            isDark={isDark}
            formatDate={formatDate}
            formatMoney={formatMoney}
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
          setTransactionFormExpense(null);
          setTransactionFormMode("add");
        }}
        bottom={fabBottom}
        ui={ui}
        isAndroid={isAndroid}
      />

      <TransactionsModals
        formMode={transactionFormMode}
        formTransaction={transactionFormExpense}
        onCloseForm={() => {
          setTransactionFormMode(null);
          setTransactionFormExpense(null);
        }}
        onRequestEdit={() => setTransactionFormMode("edit")}
        onRequestDelete={() => {
          if (transactionFormExpense) {
            handleDeleteTransaction(transactionFormExpense);
          }
        }}
        accounts={accounts}
        categories={categories}
        recurringRules={recurringRules}
        plaidDetailTransaction={selectedPlaidTransaction}
        isPlaidDetailVisible={isPlaidDetailVisible}
        onClosePlaidDetail={() => {
          setIsPlaidDetailVisible(false);
          setSelectedPlaidTransaction(null);
        }}
        onRefresh={handleModalRefresh}
        ui={ui}
        isDark={isDark}
        userId={userId}
      />

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
