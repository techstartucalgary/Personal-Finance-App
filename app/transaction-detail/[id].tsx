import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import type { ExpenseRow } from "@/components/TransactionDetailModal";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { listAccounts } from "@/utils/accounts";
import { listExpenses } from "@/utils/expenses";
import { extractGoalTransactionGoalId } from "@/utils/goal-transactions";
import { listGoals } from "@/utils/goals";
import { getPlaidTransactions, type PlaidTransaction } from "@/utils/plaid";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";

export default function PlaidTransactionDetailScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const { id, initialData } = useLocalSearchParams<{ id: string; initialData?: string }>();
  const userId = session?.user.id;
  const ui = useThemeUI();

  const [transaction, setTransaction] = useState<PlaidTransaction | ExpenseRow | null>(() => {
    if (initialData) {
      try {
        return JSON.parse(decodeURIComponent(initialData));
      } catch {
        return null;
      }
    }
    return null;
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!transaction);
  const isGoalAllocation = transaction
    ? !("transaction_id" in transaction) &&
      Boolean(extractGoalTransactionGoalId(transaction.description))
    : false;

  const loadData = useCallback(async () => {
    if (!userId || !id) return;

    if (transaction) {
      try {
        const [accountRows, goalRows] = await Promise.all([
          listAccounts({ profile_id: userId }),
          listGoals({ profile_id: userId }),
        ]);
        setAccounts((accountRows as any[]) ?? []);
        setGoals((goalRows as any[]) ?? []);
      } catch (error) {
        console.error("Error loading transaction detail dependencies:", error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const [transactions, expenses, accountRows, goalRows] = await Promise.all([
        getPlaidTransactions(),
        listExpenses({ profile_id: userId }),
        listAccounts({ profile_id: userId }),
        listGoals({ profile_id: userId }),
      ]);
      setAccounts((accountRows as any[]) ?? []);
      setGoals((goalRows as any[]) ?? []);

      const manualMatch = (expenses as ExpenseRow[]).find((expense) => String(expense.id) === id);
      if (manualMatch) {
        setTransaction(manualMatch);
        return;
      }

      const match = (transactions as PlaidTransaction[]).find((tx) => tx.transaction_id === id);
      if (match) {
        setTransaction(match);
      } else {
        Alert.alert("Error", "Transaction not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading plaid transaction detail:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, id, router, transaction]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const screenOptions = {
    title: isGoalAllocation ? "Allocation Details" : "Transaction Details",
    headerBackButtonDisplayMode: "minimal" as const,
    headerTitleAlign: "center" as const,
    headerTransparent: Platform.OS === "ios",
    headerShadowVisible: false,
    headerStyle:
      Platform.OS === "ios"
        ? { backgroundColor: "transparent" }
        : { backgroundColor: ui.bg },
    headerBackground:
      Platform.OS === "ios"
        ? () => null
        : undefined,
    headerTitleStyle: { color: ui.text },
    headerTintColor: Platform.OS === "android" ? ui.text : ui.accent,
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={screenOptions} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: ui.bg }}>
          <ActivityIndicator size="large" color={ui.accent} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <TransactionDetailModal
        visible={true}
        isSheet={false} // Full page
        hideHeader={true} // Use native header instead
        onClose={() => router.back()}
        transaction={transaction}
        accounts={accounts}
        goals={goals}
      />
    </>
  );
}
