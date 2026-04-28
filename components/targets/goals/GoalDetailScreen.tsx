import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { TransactionsList } from "@/components/transactions/TransactionsList";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Tokens } from "@/constants/authTokens";
import { useTabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { isGoalTransactionForGoal } from "@/utils/goal-transactions";
import { listAccounts } from "@/utils/accounts";
import { listExpenses } from "@/utils/expenses";
import { getGoal } from "@/utils/goals";
import {
  getPlaidAccounts,
  getPlaidTransactions,
  type PlaidAccount,
  type PlaidTransaction,
} from "@/utils/plaid";
import { getRecurringRules } from "@/utils/recurring";

import { GoalProgressRing } from "./GoalProgressRing";
import type { GoalRow, GoalSelectableAccount } from "./types";
import {
  buildSelectableAccounts,
  formatLongDate,
  formatMoney,
  getGoalFilterAccountId,
  getGoalLinkedAccountName,
  getGoalProgress,
  normalizeGoal,
} from "./utils";

export function GoalDetailScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const { ui } = useTabsTheme();
  const userId = session?.user.id;
  const { id, initialData } = useLocalSearchParams<{
    id: string;
    initialData?: string;
  }>();

  const [goal, setGoal] = useState<GoalRow | null>(() => {
    if (!initialData) return null;
    try {
      return normalizeGoal(JSON.parse(decodeURIComponent(initialData)));
    } catch {
      return null;
    }
  });
  const [accounts, setAccounts] = useState<GoalSelectableAccount[]>([]);
  const [manualAccounts, setManualAccounts] = useState<any[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<PlaidTransaction[]>([]);
  const [recurringRules, setRecurringRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!goal);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(
    async (silent = false) => {
      if (!userId || !id) return;
      if (!silent) setIsLoading(true);

      try {
        const [
          goalData,
          manualAccounts,
          plaidAccounts,
          expensesData,
          plaidTransactionsData,
          recurringRulesData,
        ] = await Promise.all([
          getGoal({ id, profile_id: userId }),
          listAccounts({ profile_id: userId }),
          getPlaidAccounts(),
          listExpenses({ profile_id: userId }),
          getPlaidTransactions(),
          getRecurringRules({ profile_id: userId }),
        ]);

        setGoal(normalizeGoal(goalData));
        setManualAccounts((manualAccounts as any[]) ?? []);
        setAccounts(
          buildSelectableAccounts({
            manualAccounts: (manualAccounts as any[]) ?? [],
            plaidAccounts,
          }),
        );
        setPlaidAccounts(plaidAccounts);
        setExpenses((expensesData as any[]) ?? []);
        setPlaidTransactions(plaidTransactionsData);
        setRecurringRules((recurringRulesData as any[]) ?? []);
      } catch (error) {
        console.error("Error loading goal detail:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [id, userId],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData]),
  );

  useEffect(() => {
    navigation.setOptions({
      title: "Goal Details",
      headerBackButtonDisplayMode: "minimal",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerTitleStyle: {
        color: ui.text,
        fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
      },
      headerTintColor: ui.accent,
      headerRight: () =>
        goal ? (
          <Pressable
            onPress={() => {
              const encodedGoal = encodeURIComponent(JSON.stringify(goal));
              router.push({
                pathname: "/goal/[id]/edit",
                params: { id: String(goal.id), initialData: encodedGoal },
              } as any);
            }}
            hitSlop={10}
            style={({ pressed }) => ({
              minWidth: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <IconSymbol name="pencil" size={18} color={ui.text} />
          </Pressable>
        ) : null,
    });
  }, [goal, navigation, router, ui.accent, ui.text]);

  const filterAccountId = useMemo(
    () => (goal ? getGoalFilterAccountId(goal) : null),
    [goal],
  );
  const goalTransactions = useMemo(
    () =>
      goal
        ? expenses.filter((expense) =>
            isGoalTransactionForGoal(expense.description, goal.id),
          )
        : [],
    [expenses, goal],
  );
  const handleOpenEdit = useCallback(() => {
    if (!goal) return;

    const encodedGoal = encodeURIComponent(JSON.stringify(goal));
    router.push({
      pathname: "/goal/[id]/edit",
      params: { id: String(goal.id), initialData: encodedGoal },
    } as any);
  }, [goal, router]);
  const handleAddTransaction = useCallback(() => {
    if (!goal) return;

    if (goal.linked_account != null) {
      router.push({
        pathname: "/transaction-add",
        params: {
          currentAccountId: String(goal.linked_account),
          initialDescription: goal.name,
          goalId: goal.id,
        },
      } as any);
      return;
    }

    Alert.alert(
      "Manual transactions unavailable",
      "This goal is linked to a synced account. Add transactions from a self-managed account instead.",
    );
  }, [goal, router]);

  if (isLoading || !goal) {
    return (
      <View style={detailStyles.loaderWrap}>
        <ActivityIndicator size="large" color={ui.accent} />
      </View>
    );
  }

  const linkedAccountName = getGoalLinkedAccountName(goal, accounts);
  const progress = getGoalProgress(goal);
  const canCreateManualTransaction = goal.linked_account != null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ui.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        detailStyles.scrollContent,
        { paddingTop: Platform.OS === "android" ? 16 : 0 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={detailStyles.headerStack}>
        <ThemedText style={[detailStyles.goalName, { color: ui.text }]}>
          {goal.name}
        </ThemedText>

        <GoalProgressRing
          progress={progress}
          ui={ui}
          currentAmount={formatMoney(goal.current_amount ?? 0)}
          targetAmount={formatMoney(goal.target_amount)}
        />
      </View>

      <View
        style={[
          detailStyles.statsCard,
          { backgroundColor: ui.surface, borderColor: ui.border },
        ]}
      >
        <DetailRow label="Linked Account" value={linkedAccountName} />
        <DetailRow label="Target Amount" value={formatMoney(goal.target_amount)} />
        <DetailRow label="Current Saved" value={formatMoney(goal.current_amount ?? 0)} />
        <DetailRow
          label="Target Date"
          value={goal.target_date ? formatLongDate(goal.target_date) : "No target date"}
        />
        <DetailRow
          label="Start Date"
          value={goal.created_at ? formatLongDate(goal.created_at) : "Not available"}
        />
      </View>

      <View style={detailStyles.actionsRow}>
        <Pressable
          onPress={handleOpenEdit}
          style={({ pressed }) => [
            detailStyles.actionButton,
            {
              backgroundColor: ui.surface,
              borderColor: ui.border,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <IconSymbol name="pencil" size={15} color={ui.text} />
          <ThemedText style={[detailStyles.actionText, { color: ui.text }]}>
            Edit Goal
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleAddTransaction}
          style={({ pressed }) => [
            detailStyles.actionButton,
            {
              backgroundColor: canCreateManualTransaction ? ui.text : ui.surface,
              borderColor: canCreateManualTransaction ? ui.text : ui.border,
              opacity: pressed ? 0.72 : canCreateManualTransaction ? 1 : 0.8,
            },
          ]}
        >
          <IconSymbol
            name="plus"
            size={15}
            color={canCreateManualTransaction ? ui.surface : ui.text}
          />
          <ThemedText
            style={[
              detailStyles.actionText,
              { color: canCreateManualTransaction ? ui.surface : ui.text },
            ]}
          >
            Add Transaction
          </ThemedText>
        </Pressable>
      </View>

      <View style={detailStyles.sectionHeader}>
        <ThemedText style={[detailStyles.sectionTitle, { color: ui.text }]}>
          Transactions
        </ThemedText>
      </View>

      <View
        style={[
          detailStyles.searchWrap,
          { backgroundColor: ui.surface, borderColor: ui.border },
        ]}
      >
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search"
          placeholderTextColor={ui.mutedText}
          style={[detailStyles.searchInput, { color: ui.text }]}
        />
        <IconSymbol name="line.3.horizontal.decrease.circle" size={16} color={ui.mutedText} />
      </View>

      <View style={detailStyles.listWrap}>
        <TransactionsList
          ui={ui}
          accounts={manualAccounts}
          plaidAccounts={plaidAccounts}
          expenses={goalTransactions}
          plaidTransactions={[]}
          recurringRules={recurringRules}
          filterAccountId={filterAccountId}
          onFilterAccountChange={() => {}}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          isLoading={isLoading}
          showSearch={false}
          showFilters={false}
          showMeta={false}
          showBadges={false}
          subtleAmountColors={true}
          emptyLabel="No goal transactions found."
          onSelectTransaction={(transaction) => {
            const encoded = encodeURIComponent(JSON.stringify(transaction));
            if ("transaction_id" in transaction) {
              router.push({
                pathname: "/transaction-detail/[id]",
                params: { id: transaction.transaction_id, initialData: encoded },
              });
              return;
            }

            router.push({
              pathname: "/transaction/[id]",
              params: {
                id: String(transaction.id),
                initialData: encoded,
                goalId: goal.id,
              },
            });
          }}
        />
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { ui } = useTabsTheme();

  return (
    <View style={detailStyles.detailRow}>
      <ThemedText style={[detailStyles.detailLabel, { color: ui.mutedText }]}>
        {label}
      </ThemedText>
      <ThemedText style={[detailStyles.detailValue, { color: ui.text }]}>
        {value}
      </ThemedText>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 42,
    gap: 18,
  },
  headerStack: {
    alignItems: "center",
    gap: 16,
  },
  goalName: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  statsCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  detailValue: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Tokens.font.family,
  },
  sectionHeader: {
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  actionText: {
    fontSize: 14,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  searchWrap: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    fontFamily: Tokens.font.family,
  },
  listWrap: {
    gap: 10,
  },
});
