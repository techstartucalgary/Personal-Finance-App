import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import type { ExpenseRow } from "@/components/transactions/tab/types";
import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";
import { useTabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listAccounts } from "@/utils/accounts";
import { getBudget } from "@/utils/budgets";
import { listCategoryBudgets } from "@/utils/categoryBudgets";
import { listAllSubcategories, listCategories } from "@/utils/categories";
import { listExpenses } from "@/utils/expenses";
import { getPlaidAccounts } from "@/utils/plaid";

import { getBudgetUiPreference } from "./storage";
import type { BudgetRow, BudgetSelectableAccount, BudgetWithDetails } from "./types";
import {
  buildBudgetWithDetails,
  formatBudgetPeriodLabel,
  formatLongDate,
  formatMoney,
  formatShortDate,
  getBudgetStatusTone,
} from "./utils";

import { buildSelectableAccounts, getGoalSelectionKey } from "../goals/utils";

const AVATAR_COLORS = ["#DE7C78", "#67C7C0", "#D96CB9", "#6F8BEA", "#F2B35D"];

export function BudgetDetailScreen() {
  const { session } = useAuthContext();
  const navigation = useNavigation();
  const router = useRouter();
  const { ui } = useTabsTheme();
  const userId = session?.user.id;
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [budget, setBudget] = useState<BudgetWithDetails | null>(null);
  const [accounts, setAccounts] = useState<BudgetSelectableAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadBudget = useCallback(
    async (silent = false) => {
      if (!userId || !id) return;

      if (!silent) setIsLoading(true);
      try {
        const [
          budgetRow,
          categoryLinks,
          categoryRows,
          subcategoryRows,
          expenses,
          manualAccounts,
          plaidAccounts,
          preference,
        ] = await Promise.all([
          getBudget({ id, profile_id: userId }),
          listCategoryBudgets({ budget_id: Number(id) }),
          listCategories({ profile_id: userId }),
          listAllSubcategories({ profile_id: userId }),
          listExpenses({ profile_id: userId }),
          listAccounts({ profile_id: userId }),
          getPlaidAccounts(),
          getBudgetUiPreference(id),
        ]);

        const selectableAccounts = buildSelectableAccounts({
          manualAccounts: (manualAccounts as any[]) ?? [],
          plaidAccounts,
        });

        setAccounts(selectableAccounts);
        setBudget(
          buildBudgetWithDetails({
            budget: budgetRow as BudgetRow,
            categoryBudgets: categoryLinks,
            categories: categoryRows ?? [],
            subcategories: subcategoryRows ?? [],
            expenses: (expenses as ExpenseRow[]) ?? [],
            preference,
          }),
        );
      } catch (error) {
        console.error("Error loading budget detail:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [id, userId],
  );

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  useFocusEffect(
    useCallback(() => {
      loadBudget(true);
    }, [loadBudget]),
  );

  useEffect(() => {
    navigation.setOptions({
      title: "View Budget",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: {
        color: ui.text,
        fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
      },
      headerTintColor: ui.text,
      headerRight: () =>
        budget ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/budget/[id]/edit",
                params: {
                  id: String(budget.id),
                  initialData: encodeURIComponent(JSON.stringify(budget)),
                },
              } as any)
            }
            hitSlop={10}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <Feather name="more-vertical" size={18} color={ui.text} />
          </Pressable>
        ) : null,
    });
  }, [budget, navigation, router, ui.bg, ui.text]);

  const linkedAccount = useMemo(() => {
    if (!budget?.linkedAccountKey) return null;
    return (
      accounts.find(
        (account) => getGoalSelectionKey(account) === budget.linkedAccountKey,
      ) ?? null
    );
  }, [accounts, budget?.linkedAccountKey]);

  const transactions = useMemo(() => {
    if (!budget) return [] as ExpenseRow[];
    const allTransactions = budget.categoryBudgets.flatMap((category) => category.transactions);
    const uniqueTransactions = Array.from(
      new Map(allTransactions.map((entry) => [entry.id, entry])).values(),
    );

    if (!searchQuery) return uniqueTransactions;
    const lowered = searchQuery.toLowerCase();
    return uniqueTransactions.filter(
      (entry) =>
        entry.description?.toLowerCase().includes(lowered) ||
        entry.amount?.toString().includes(searchQuery),
    );
  }, [budget, searchQuery]);

  if (isLoading || !budget) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: ui.bg }]}>
        <ActivityIndicator size="large" color={ui.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ui.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Platform.OS === "android" ? 16 : 0 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroWrap}>
        <View style={styles.heroPanel}>
          <ThemedText style={[styles.heroName, { color: ui.text }]}>
            {budget.budget_name}
          </ThemedText>
          <ThemedText
            style={[
              styles.heroAmount,
              { color: budget.availableAmount < 0 ? "#F15A46" : ui.text },
            ]}
          >
            {formatMoney(budget.total_amount)}
          </ThemedText>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/budget/[id]/edit",
                params: {
                  id: String(budget.id),
                  initialData: encodeURIComponent(JSON.stringify(budget)),
                },
              } as any)
            }
            style={({ pressed }) => [styles.linkAccountWrap, { opacity: pressed ? 0.72 : 1 }]}
          >
            <ThemedText style={[styles.linkAccountLabel, { color: ui.text }]}>
              Link Account
            </ThemedText>
            {linkedAccount ? (
              <AccountBadge account={linkedAccount} />
            ) : (
              <View style={styles.plusCircle}>
                <Feather name="plus" size={18} color={ui.text} />
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.bodyStack}>
        <View style={styles.topMetaRow}>
          <View style={styles.metaBlock}>
            <ThemedText style={[styles.metaLabel, { color: ui.text }]}>
              Recurrence
            </ThemedText>
            <ThemedText style={[styles.metaValue, { color: ui.mutedText }]}>
              {formatBudgetPeriodLabel(budget.recurrence)}
            </ThemedText>
          </View>
          <View style={[styles.metaBlock, { alignItems: "flex-end" }]}>
            <View style={styles.rolloverLabelRow}>
              <ThemedText style={[styles.metaLabel, { color: ui.text }]}>
                Rollover
              </ThemedText>
              <Feather name="info" size={12} color={ui.mutedText} />
            </View>
            <View
              style={[
                styles.rolloverPill,
                {
                  backgroundColor: budget.rolloverEnabled ? "#E7E7EB" : "#D8D8DE",
                },
              ]}
            >
              <View
                style={[
                  styles.rolloverThumb,
                  budget.rolloverEnabled && styles.rolloverThumbActive,
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.metaBlock}>
          <ThemedText style={[styles.metaLabel, { color: ui.text }]}>
            Start Date
          </ThemedText>
          <ThemedText style={[styles.metaValue, { color: ui.mutedText }]}>
            {formatLongDate(budget.start_date)}
          </ThemedText>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
            Expenses
          </ThemedText>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/budget/[id]/edit",
                params: {
                  id: String(budget.id),
                  initialData: encodeURIComponent(JSON.stringify(budget)),
                },
              } as any)
            }
            style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
          >
            <ThemedText style={[styles.sectionAction, { color: ui.text }]}>
              Add Expense
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.tableWrap}>
          <View style={styles.tableHeader}>
            <ThemedText style={[styles.headerName, { color: ui.text }]}>Name</ThemedText>
            <ThemedText style={[styles.headerMetric, { color: ui.mutedText }]}>
              Budgeted
            </ThemedText>
            <ThemedText style={[styles.headerMetric, { color: ui.mutedText }]}>
              Available
            </ThemedText>
            <Feather name="eye" size={14} color={ui.mutedText} />
          </View>

          {budget.categoryBudgets.map((category) => (
            <View key={category.id} style={styles.tableRow}>
              <View style={styles.rowNameWrap}>
                <ThemedText style={[styles.rowName, { color: ui.text }]}>
                  {category.category_name}
                </ThemedText>
                {category.subcategories.length > 0 ? (
                  <ThemedText style={[styles.rowMeta, { color: ui.mutedText }]}>
                    {category.subcategories
                      .map((subcategory) => `${subcategory.name} ${formatMoney(subcategory.spent)}`)
                      .join("  •  ")}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText style={[styles.rowMetric, { color: ui.text }]}>
                {formatMoney(category.limit_amount)}
              </ThemedText>
              <ThemedText
                style={[
                  styles.rowMetric,
                  {
                    color: category.available < 0 ? "#D55C4B" : getBudgetStatusTone(category.available),
                  },
                ]}
              >
                {formatMoney(category.available)}
              </ThemedText>
              <Feather name="eye" size={14} color={ui.text} />
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
            Transactions
          </ThemedText>
        </View>

        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: ui.surface,
              borderColor: ui.border,
            },
          ]}
        >
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={ui.mutedText}
            style={[styles.searchInput, { color: ui.text }]}
          />
          <Feather name="sliders" size={15} color={ui.mutedText} />
        </View>

        <View style={styles.transactionsStack}>
          {transactions.length === 0 ? (
            <ThemedText style={{ color: ui.mutedText }}>
              No transactions found for this budget window.
            </ThemedText>
          ) : (
            transactions.map((transaction, index) => {
              const previous = transactions[index - 1];
              const dateLabel = formatLongDate(
                transaction.transaction_date || transaction.created_at,
              );
              const previousLabel = previous
                ? formatLongDate(previous.transaction_date || previous.created_at)
                : null;
              const showLabel = dateLabel !== previousLabel;

              return (
                <View key={transaction.id} style={styles.transactionGroup}>
                  {showLabel ? (
                    <ThemedText style={[styles.transactionDate, { color: ui.mutedText }]}>
                      {formatShortDate(transaction.transaction_date || transaction.created_at)}
                    </ThemedText>
                  ) : null}

                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/transaction/[id]",
                        params: { id: String(transaction.id) },
                      } as any)
                    }
                    style={({ pressed }) => [
                      styles.transactionRow,
                      {
                        backgroundColor: ui.surface,
                        borderColor: ui.border,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    <View style={styles.transactionCopy}>
                      <ThemedText style={[styles.transactionTitle, { color: ui.text }]}>
                        {transaction.description ?? "Expense"}
                      </ThemedText>
                    </View>

                    <View style={styles.transactionAmountWrap}>
                      <Feather name="arrow-up" size={12} color="#2D9F67" />
                      <ThemedText style={[styles.transactionAmount, { color: ui.text }]}>
                        {formatMoney(transaction.amount)}
                      </ThemedText>
                    </View>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function AccountBadge({ account }: { account: BudgetSelectableAccount }) {
  const colorIndex = Math.abs(account.name.length) % AVATAR_COLORS.length;
  return (
    <View style={[styles.accountBadge, { backgroundColor: AVATAR_COLORS[colorIndex] }]}>
      <ThemedText style={styles.accountBadgeText}>{getInitials(account.name)}</ThemedText>
    </View>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 18,
  },
  heroWrap: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FFD38F",
    boxShadow: "0 10px 16px rgba(0, 0, 0, 0.14)",
  },
  heroPanel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: "center",
    gap: 8,
  },
  heroName: {
    fontSize: 28,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    textDecorationLine: "underline",
  },
  heroAmount: {
    fontSize: 50,
    lineHeight: 54,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    fontVariant: ["tabular-nums"],
  },
  linkAccountWrap: {
    alignItems: "center",
    gap: 6,
  },
  linkAccountLabel: {
    fontSize: 15,
    fontFamily: Tokens.font.family,
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  accountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  accountBadgeText: {
    color: "#1C1C1C",
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  bodyStack: {
    paddingHorizontal: 16,
    gap: 18,
  },
  topMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  metaBlock: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  metaValue: {
    fontSize: 16,
    fontFamily: Tokens.font.family,
  },
  rolloverLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rolloverPill: {
    width: 40,
    height: 22,
    borderRadius: 999,
    padding: 2,
    justifyContent: "center",
  },
  rolloverThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
  },
  rolloverThumbActive: {
    alignSelf: "flex-end",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 26,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  sectionAction: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  tableWrap: {
    gap: 10,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerName: {
    flex: 1,
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  headerMetric: {
    width: 78,
    textAlign: "right",
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowName: {
    fontSize: 13,
    fontFamily: Tokens.font.family,
  },
  rowNameWrap: {
    flex: 1,
    gap: 2,
  },
  rowMeta: {
    fontSize: 10,
    fontFamily: Tokens.font.family,
  },
  rowMetric: {
    width: 78,
    textAlign: "right",
    fontSize: 13,
    fontFamily: Tokens.font.family,
    fontVariant: ["tabular-nums"],
  },
  searchWrap: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    fontFamily: Tokens.font.family,
  },
  transactionsStack: {
    gap: 10,
  },
  transactionGroup: {
    gap: 6,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  transactionRow: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  transactionCopy: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontFamily: Tokens.font.family,
  },
  transactionAmountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  transactionAmount: {
    fontSize: 14,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontVariant: ["tabular-nums"],
  },
});
