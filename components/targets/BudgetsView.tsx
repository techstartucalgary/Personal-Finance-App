import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { AccountRow, FilterAccountId } from "@/components/transactions/tab/types";
import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";
import { tabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listBudgets } from "@/utils/budgets";
import type { CategoryBudgetRow } from "@/utils/categoryBudgets";
import { listCategories } from "@/utils/categories";
import { listExpenses } from "@/utils/expenses";
import type { PlaidAccount } from "@/utils/plaid";
import { supabase } from "@/utils/supabase";

import { getAllBudgetUiPreferences } from "./budgets/storage";
import type { BudgetRow, BudgetWithDetails } from "./budgets/types";
import {
  buildBudgetCollection,
  filterBudgetsByAccount,
  formatBudgetDateRange,
  formatBudgetPeriodLabel,
  formatMoney,
  getBudgetOverview,
  getBudgetStatusTone,
} from "./budgets/utils";

type BudgetsViewProps = {
  accounts: AccountRow[];
  plaidAccounts: PlaidAccount[];
  filterAccountId?: FilterAccountId;
  refreshKey?: number;
  searchQuery?: string;
};

export function BudgetsView({
  accounts,
  plaidAccounts,
  filterAccountId = null,
  refreshKey = 0,
  searchQuery = "",
}: BudgetsViewProps) {
  const { session } = useAuthContext();
  const router = useRouter();
  const ui = tabsTheme.ui;
  const userId = session?.user.id;

  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadBudgets = useCallback(
    async (silent = false) => {
      if (!userId) {
        setBudgets([]);
        return;
      }

      if (!silent) setIsLoading(true);
      try {
        const [budgetRows, categoryRows, expenseRows, linksResponse, preferences] =
          await Promise.all([
            listBudgets({ profile_id: userId }),
            listCategories({ profile_id: userId }),
            listExpenses({ profile_id: userId }),
            supabase.from("Expense_category_budget").select("*"),
            getAllBudgetUiPreferences(),
          ]);

        if (linksResponse.error) throw linksResponse.error;

        setBudgets(
          buildBudgetCollection({
            budgets: (budgetRows as BudgetRow[]) ?? [],
            categoryBudgets: ((linksResponse.data as CategoryBudgetRow[]) ?? []).filter(Boolean),
            categories: categoryRows ?? [],
            expenses: (expenseRows as any[]) ?? [],
            preferences,
          }),
        );
      } catch (error) {
        console.error("Error loading budgets:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      loadBudgets(true);
    }, [loadBudgets]),
  );

  useEffect(() => {
    if (refreshKey > 0) {
      loadBudgets(true);
    }
  }, [loadBudgets, refreshKey]);

  const visibleBudgets = useMemo(() => {
    const accountFiltered = filterBudgetsByAccount(budgets, filterAccountId);
    if (!searchQuery) return accountFiltered;
    return accountFiltered.filter((budget) =>
      budget.budget_name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [budgets, filterAccountId, searchQuery]);

  const overview = useMemo(
    () =>
      getBudgetOverview(visibleBudgets, {
        accounts,
        plaidAccounts,
        filterAccountId,
      }),
    [accounts, filterAccountId, plaidAccounts, visibleBudgets],
  );

  if (!isLoading && visibleBudgets.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <ThemedText style={[styles.emptyTitle, { color: ui.text }]}>
          No Budget Found
        </ThemedText>
        <Pressable
          onPress={() => router.push("/budget-add" as any)}
          style={({ pressed }) => [
            styles.emptyButton,
            {
              borderColor: ui.border,
              backgroundColor: ui.surface,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.emptyButtonText, { color: ui.text }]}>
            Add A Budget
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.overviewHeader}>
        <ThemedText style={[styles.overviewLabel, { color: ui.text }]}>
          Overview
        </ThemedText>
        <Feather name="chevron-down" size={16} color={ui.mutedText} />
      </View>

      <View
        style={[
          styles.overviewCard,
          {
            backgroundColor: ui.surface,
            borderColor: ui.border,
          },
        ]}
      >
        <BudgetStat label="Total Budgeted" value={formatMoney(overview.totalBudgeted)} />
        <BudgetStat label="Total Funds Available" value={formatMoney(overview.totalFundsAvailable)} />
        <View style={{ alignItems: "center", gap: 2 }}>
          <ThemedText style={[styles.statusLabel, { color: ui.mutedText }]}>Status</ThemedText>
          <ThemedText
            style={[
              styles.statusValue,
              { color: overview.statusColor || getBudgetStatusTone(overview.totalFundsAvailable) },
            ]}
          >
            {overview.statusLabel}
          </ThemedText>
        </View>
      </View>

      <View style={styles.stack}>
        {visibleBudgets.map((budget) => (
          <Pressable
            key={budget.id}
            onPress={() =>
              router.push({
                pathname: "/budget/[id]",
                params: { id: String(budget.id) },
              } as any)
            }
            style={({ pressed }) => [
              styles.budgetCard,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Feather name="chevron-down" size={16} color={ui.mutedText} />
                <View style={styles.cardHeaderCopy}>
                  <ThemedText style={[styles.cardTitle, { color: ui.text }]}>
                    {budget.budget_name || "Budget Plan"}
                  </ThemedText>
                  <ThemedText style={[styles.cardSubtitle, { color: ui.mutedText }]}>
                    {formatBudgetPeriodLabel(budget.recurrence)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.cardHeaderRight}>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <ThemedText style={[styles.cardMetricLabel, { color: ui.text }]}>
                    Unused Funds
                  </ThemedText>
                  <ThemedText style={[styles.cardMetricValue, { color: ui.text }]}>
                    {formatMoney(budget.availableAmount)}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/budget/[id]/edit",
                      params: { id: String(budget.id) },
                    } as any)
                  }
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                >
                  <Feather name="edit-2" size={15} color={ui.text} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.tableHeader, { borderBottomColor: ui.border }]}>
              <ThemedText style={[styles.headerName, { color: ui.text }]}>Name</ThemedText>
              <ThemedText style={[styles.headerMetric, { color: ui.mutedText }]}>
                Budgeted
              </ThemedText>
              <ThemedText style={[styles.headerMetric, { color: ui.mutedText }]}>
                Available
              </ThemedText>
              <Feather name="eye" size={14} color={ui.mutedText} />
            </View>

            <View style={styles.tableBody}>
              {budget.categoryBudgets.map((category) => (
                <View key={category.id} style={styles.tableRow}>
                  <View style={styles.nameColumn}>
                    <ThemedText style={[styles.rowTitle, { color: ui.text }]}>
                      {category.category_name}
                    </ThemedText>
                    <ThemedText style={[styles.rowFootnote, { color: ui.mutedText }]}>
                      {formatBudgetDateRange(budget)}
                    </ThemedText>
                  </View>

                  <ThemedText style={[styles.rowMetric, { color: ui.text }]}>
                    {formatMoney(category.limit_amount)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.rowMetric,
                      {
                        color: category.available < 0 ? "#D55C4B" : ui.text,
                      },
                    ]}
                  >
                    {formatMoney(category.available)}
                  </ThemedText>
                  <Feather name="eye" size={14} color={ui.mutedText} />
                </View>
              ))}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function BudgetStat({ label, value }: { label: string; value: string }) {
  const ui = tabsTheme.ui;

  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <ThemedText style={[styles.statLabel, { color: ui.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.statValue, { color: ui.text }]}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  stack: {
    gap: 12,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  overviewLabel: {
    fontSize: 16,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  overviewCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    fontVariant: ["tabular-nums"],
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: Tokens.font.family,
  },
  statusValue: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  emptyWrap: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 26,
    lineHeight: 30,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    maxWidth: 260,
  },
  emptyButton: {
    minWidth: 150,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    textTransform: "uppercase",
  },
  budgetCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.08)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: Tokens.font.family,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardMetricLabel: {
    fontSize: 11,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  cardMetricValue: {
    fontSize: 13,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    fontVariant: ["tabular-nums"],
  },
  tableHeader: {
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableBody: {
    gap: 10,
  },
  headerName: {
    flex: 1,
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  headerMetric: {
    width: 68,
    textAlign: "right",
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameColumn: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontFamily: Tokens.font.family,
  },
  rowFootnote: {
    fontSize: 10,
    fontFamily: Tokens.font.family,
  },
  rowMetric: {
    width: 68,
    textAlign: "right",
    fontSize: 13,
    fontFamily: Tokens.font.family,
    fontVariant: ["tabular-nums"],
  },
});
