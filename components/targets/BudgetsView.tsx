import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { AccountRow, FilterAccountId } from "@/components/transactions/tab/types";
import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";
import { useTabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listBudgets } from "@/utils/budgets";
import type { CategoryBudgetRow } from "@/utils/categoryBudgets";
import { listAllSubcategories, listCategories } from "@/utils/categories";
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
  const { ui } = useTabsTheme();
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
        const [budgetRows, categoryRows, subcategoryRows, expenseRows, linksResponse, preferences] =
          await Promise.all([
            listBudgets({ profile_id: userId }),
            listCategories({ profile_id: userId }),
            listAllSubcategories({ profile_id: userId }),
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
            subcategories: subcategoryRows ?? [],
            expenses: (expenseRows as any[]) ?? [],
            preferences,
            filterAccountId,
          }),
        );
      } catch (error) {
        console.error("Error loading budgets:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [filterAccountId, userId],
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
      <View
        style={[
          styles.emptyWrap,
          {
            backgroundColor: ui.surface,
            borderColor: ui.border,
          },
        ]}
      >
        <ThemedText style={[styles.emptyTitle, { color: ui.text }]}>
          No Budget Found
        </ThemedText>
        <Pressable
          onPress={() => router.push("/budget-add" as any)}
          style={({ pressed }) => [
            styles.emptyButton,
            {
              borderColor: ui.accent,
              backgroundColor: ui.accent,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.emptyButtonText, { color: ui.surface }]}>
            Add a Budget
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.sectionPanel,
          {
            backgroundColor: ui.surface,
            borderColor: ui.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
            Overview
          </ThemedText>
          <ThemedText style={[styles.sectionCount, { color: ui.mutedText }]}>
            {visibleBudgets.length}
          </ThemedText>
        </View>

        <View style={[styles.sectionBody, { borderTopColor: ui.border }]}>
          <View
            style={[
              styles.overviewCard,
              {
                backgroundColor: ui.bg,
                borderColor: ui.border,
              },
            ]}
          >
            <BudgetStat label="Total Budgeted" value={formatMoney(overview.totalBudgeted)} />
            <BudgetStat
              label="Total Funds Available"
              value={formatMoney(overview.totalFundsAvailable)}
            />
            <View style={styles.statusStat}>
              <ThemedText style={[styles.statusLabel, { color: ui.mutedText }]}>
                Status
              </ThemedText>
              <ThemedText
                style={[
                  styles.statusValue,
                  {
                    color:
                      overview.statusColor ||
                      getBudgetStatusTone(overview.totalFundsAvailable),
                  },
                ]}
              >
                {overview.statusLabel}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.sectionPanel,
          {
            backgroundColor: ui.surface,
            borderColor: ui.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
            Budget Plans
          </ThemedText>
          <ThemedText style={[styles.sectionCount, { color: ui.mutedText }]}>
            {visibleBudgets.length}
          </ThemedText>
        </View>

        <View style={[styles.sectionBody, { borderTopColor: ui.border }]}>
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
                    backgroundColor: ui.bg,
                    borderColor: ui.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
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
                      <ThemedText style={[styles.cardMetricLabel, { color: ui.mutedText }]}>
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
                </View>

                <View style={styles.tableBody}>
                  {budget.categoryBudgets.map((category, index) => (
                    <View
                      key={category.id}
                      style={[
                        styles.tableRow,
                        {
                          borderBottomColor: ui.border,
                          borderBottomWidth:
                            index === budget.categoryBudgets.length - 1
                              ? 0
                              : StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
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
                    </View>
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function BudgetStat({ label, value }: { label: string; value: string }) {
  const { ui } = useTabsTheme();

  return (
    <View style={styles.statBlock}>
      <ThemedText style={[styles.statLabel, { color: ui.mutedText }]}>{label}</ThemedText>
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
  sectionPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    overflow: "hidden",
  },
  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  sectionCount: {
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: Tokens.font.family,
  },
  sectionBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  overviewCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.06)",
  },
  statBlock: {
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
    fontVariant: ["tabular-nums"],
  },
  statusStat: {
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.family,
  },
  statusValue: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  emptyWrap: {
    minHeight: 300,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    maxWidth: 260,
  },
  emptyButton: {
    minWidth: 150,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  budgetCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.06)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
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
    fontSize: 14,
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
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
    gap: 0,
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
    paddingVertical: 10,
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
