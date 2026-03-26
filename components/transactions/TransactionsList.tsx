import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { TabsUi } from "@/constants/tabsTheme";
import { Tokens } from "@/constants/authTokens";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";

export type AccountRow = {
  id: number;
  account_name: string | null;
  account_type: string | null;
  balance: number | null;
  currency: string | null;
};

export type ExpenseRow = {
  id: string;
  amount: number | null;
  description?: string | null;
  created_at?: string | null;
  account_id?: number | null;
  expense_categoryid?: number | null;
  subcategory_id?: number | null;
  transaction_date?: string | null;
  recurring_rule_id?: number | null;
};

type FilterId = string | number | null;

type Visual = {
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
};

type NormalizedTx = {
  id: string;
  source: "manual" | "plaid";
  title: string;
  date: string | null;
  amount: number;
  accountLabel: string;
  categoryLine?: string;
  isPending?: boolean;
  recurringLabel?: string;
  isRecurringActive?: boolean;
  raw: ExpenseRow | PlaidTransaction;
  visual: Visual;
};

const CATEGORY_VISUALS: { keywords: string[]; icon: Visual["icon"]; color: string }[] = [
  { keywords: ["grocery", "groceries", "supermarket"], icon: "shopping-cart", color: "#2F9E44" },
  { keywords: ["food", "restaurant", "dining", "cafe", "coffee"], icon: "coffee", color: "#F08C00" },
  { keywords: ["health", "medical", "pharmacy"], icon: "activity", color: "#E03131" },
  { keywords: ["transport", "uber", "lyft", "gas", "fuel", "transit"], icon: "truck", color: "#1971C2" },
  { keywords: ["phone", "mobile", "internet", "wifi"], icon: "phone", color: "#4C6EF5" },
  { keywords: ["home", "rent", "mortgage", "house"], icon: "home", color: "#15AABF" },
  { keywords: ["movie", "netflix", "entertain", "cinema"], icon: "film", color: "#845EF7" },
  { keywords: ["shopping", "store", "retail", "amazon"], icon: "shopping-bag", color: "#E8590C" },
  { keywords: ["salary", "income", "payroll", "deposit"], icon: "dollar-sign", color: "#2B8A3E" },
  { keywords: ["travel", "flight", "hotel", "airbnb"], icon: "map-pin", color: "#F06595" },
  { keywords: ["gift", "present"], icon: "gift", color: "#E64980" },
];

const FALLBACK_COLORS = [
  "#1971C2",
  "#2F9E44",
  "#E8590C",
  "#6741D9",
  "#0B7285",
  "#D9480F",
  "#C2255C",
  "#5F3DC4",
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(value);

const getOrdinalSuffix = (value: number) => {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const formatHeaderDate = (value?: string | null) => {
  if (!value) return "Unknown date";
  const date = parseLocalDate(value);
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  return `${month} ${day}${getOrdinalSuffix(day)}`;
};

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getVisual = (title: string, category?: string | null): Visual => {
  const haystack = `${title} ${category ?? ""}`.toLowerCase();
  const matched = CATEGORY_VISUALS.find((entry) =>
    entry.keywords.some((keyword) => haystack.includes(keyword)),
  );
  if (matched) return { icon: matched.icon, color: matched.color };
  const color = FALLBACK_COLORS[hashString(haystack) % FALLBACK_COLORS.length];
  return { icon: "tag", color };
};

const buildAccountLabel = (accountName?: string | null, mask?: string | null) => {
  if (!accountName && !mask) return "Manual account";
  const safeName = accountName ?? "Account";
  if (!mask) return safeName;
  return `${safeName} ****${mask}`;
};

interface TransactionsListProps {
  ui: TabsUi;
  expenses: ExpenseRow[];
  plaidTransactions: PlaidTransaction[];
  recurringRules?: any[];
  accounts: AccountRow[];
  plaidAccounts?: PlaidAccount[];
  filterAccountId: FilterId;
  onFilterAccountChange: (id: FilterId) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSelectTransaction: (tx: ExpenseRow | PlaidTransaction) => void;
  isLoading?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  defaultFiltersExpanded?: boolean;
  showMeta?: boolean;
  showBadges?: boolean;
  emptyLabel?: string;
}

export function TransactionsList({
  ui,
  expenses,
  plaidTransactions,
  recurringRules = [],
  accounts,
  plaidAccounts = [],
  filterAccountId,
  onFilterAccountChange,
  searchQuery,
  onSearchQueryChange,
  onSelectTransaction,
  isLoading = false,
  showSearch = true,
  showFilters = true,
  defaultFiltersExpanded = false,
  showMeta = false,
  showBadges = false,
  emptyLabel = "No transactions found.",
}: TransactionsListProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(
    showFilters && defaultFiltersExpanded,
  );

  useEffect(() => {
    if (!showFilters) {
      setFiltersExpanded(false);
      return;
    }
    setFiltersExpanded(defaultFiltersExpanded);
  }, [defaultFiltersExpanded, showFilters]);
  const search = searchQuery.trim().toLowerCase();
  const isManualFilter = typeof filterAccountId === "number";
  const isPlaidFilter =
    typeof filterAccountId === "string" && filterAccountId.startsWith("plaid:");

  const normalized = useMemo<NormalizedTx[]>(() => {
    const manual = expenses
      .filter((expense) => {
        if (isPlaidFilter) return false;
        if (filterAccountId !== null && isManualFilter) {
          if (expense.account_id !== filterAccountId) return false;
        }
        if (!search) return true;
        const description = expense.description ?? "";
        const amount = expense.amount?.toString() ?? "";
        const accountName =
          accounts.find((acc) => acc.id === expense.account_id)?.account_name ??
          "";
        return (
          description.toLowerCase().includes(search) ||
          amount.includes(search) ||
          accountName.toLowerCase().includes(search)
        );
      })
      .map((expense) => {
        const account = accounts.find((acc) => acc.id === expense.account_id);
        const title = expense.description ?? "Manual transaction";
        const accountLabel = buildAccountLabel(account?.account_name ?? null, null);
        const recurringRule = recurringRules.find(
          (rule) => rule.id === expense.recurring_rule_id,
        );
        const recurringLabel = recurringRule
          ? recurringRule.is_active
            ? "Recurring"
            : "Paused"
          : undefined;
        const visual = getVisual(title, recurringLabel ?? null);
        return {
          id: `manual:${expense.id}`,
          source: "manual",
          title,
          date: expense.transaction_date || expense.created_at || null,
          amount: expense.amount ?? 0,
          accountLabel,
          recurringLabel,
          isRecurringActive: recurringRule?.is_active,
          raw: expense,
          visual,
        };
      });

    const plaid = plaidTransactions
      .filter((tx) => {
        if (isManualFilter) return false;
        if (isPlaidFilter) {
          const plaidId = filterAccountId?.toString().replace("plaid:", "");
          if (tx.account_id !== plaidId) return false;
        }
        if (!search) return true;
        const title = tx.merchant_name || tx.name || "";
        const amount = tx.amount?.toString() ?? "";
        const institution = tx.institution_name ?? "";
        const accountName = tx.account_name ?? "";
        const category = (tx.category ?? []).join(" ");
        return (
          title.toLowerCase().includes(search) ||
          amount.includes(search) ||
          institution.toLowerCase().includes(search) ||
          accountName.toLowerCase().includes(search) ||
          category.toLowerCase().includes(search)
        );
      })
      .map((tx) => {
        const account = plaidAccounts.find(
          (acct) => acct.account_id === tx.account_id,
        );
        const title = tx.merchant_name || tx.name || "Bank transaction";
        const accountLabel = buildAccountLabel(
          tx.account_name ?? account?.name ?? null,
          tx.account_mask ?? account?.mask ?? null,
        );
        const categoryLine = tx.category?.length
          ? tx.category.join(" > ")
          : undefined;
        const visual = getVisual(title, categoryLine ?? null);
        return {
          id: `plaid:${tx.transaction_id}`,
          source: "plaid",
          title,
          date: tx.date || null,
          amount: tx.amount ?? 0,
          accountLabel,
          categoryLine,
          isPending: tx.pending,
          raw: tx,
          visual,
        };
      });

    return [...manual, ...plaid].sort((a, b) => {
      const dateA = a.date ? parseLocalDate(a.date).getTime() : 0;
      const dateB = b.date ? parseLocalDate(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [
    accounts,
    expenses,
    filterAccountId,
    isManualFilter,
    isPlaidFilter,
    plaidAccounts,
    plaidTransactions,
    recurringRules,
    search,
  ]);

  const sections = useMemo(() => {
    const groups: Record<string, { title: string; items: NormalizedTx[] }> = {};
    normalized.forEach((tx) => {
      const dateObj = tx.date ? parseLocalDate(tx.date) : new Date();
      const key = toLocalISOString(dateObj);
      if (!groups[key]) {
        groups[key] = { title: formatHeaderDate(tx.date), items: [] };
      }
      groups[key].items.push(tx);
    });
    return Object.entries(groups)
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [normalized]);

  return (
    <View style={styles.wrap}>
      {showSearch && (
        <View style={[styles.searchWrap, { borderColor: ui.border, backgroundColor: ui.surface2 }]}>
          <TextInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="Search"
            placeholderTextColor={ui.mutedText}
            style={[styles.searchInput, { color: ui.text }]}
          />
          {showFilters && (
            <Pressable
              onPress={() => setFiltersExpanded((prev) => !prev)}
              style={[styles.filterButton, { borderColor: ui.border }]}
            >
              <Feather
                name="filter"
                size={16}
                color={filtersExpanded ? ui.text : ui.mutedText}
              />
            </Pressable>
          )}
        </View>
      )}

      {showFilters && filtersExpanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <Pressable
            onPress={() => onFilterAccountChange(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterAccountId === null ? ui.text : ui.surface2,
                borderColor: ui.border,
              },
            ]}
          >
            <ThemedText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: filterAccountId === null ? ui.surface : ui.text,
              }}
            >
              All
            </ThemedText>
          </Pressable>

          {accounts.map((acct) => (
            <Pressable
              key={`acct-${acct.id}`}
              onPress={() => onFilterAccountChange(acct.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filterAccountId === acct.id ? ui.text : ui.surface2,
                  borderColor: ui.border,
                },
              ]}
            >
              <ThemedText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: filterAccountId === acct.id ? ui.surface : ui.text,
                }}
              >
                {acct.account_name ?? "Account"}
              </ThemedText>
            </Pressable>
          ))}

          {plaidAccounts.map((acct) => {
            const chipId = `plaid:${acct.account_id}`;
            const isSelected = filterAccountId === chipId;
            return (
              <Pressable
                key={chipId}
                onPress={() => onFilterAccountChange(chipId)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? ui.text : ui.surface2,
                    borderColor: ui.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isSelected ? ui.surface : ui.text,
                  }}
                >
                  {acct.name}
                  {acct.mask ? ` ****${acct.mask}` : ""}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {sections.length === 0 ? (
        <ThemedText style={{ color: ui.mutedText }}>
          {isLoading ? "Loading..." : emptyLabel}
        </ThemedText>
      ) : (
        sections.map((section) => (
          <View key={section.key} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
                {section.title}
              </ThemedText>
            </View>
            <View style={[styles.sectionCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
              {section.items.map((tx, index) => {
                const isInflow = tx.source === "plaid" && tx.amount < 0;
                const amountColor = isInflow ? ui.accent : ui.danger;
                const amountValue = Math.abs(tx.amount);
                const showDivider = index !== section.items.length - 1;

                return (
                  <Pressable
                    key={tx.id}
                    onPress={() => onSelectTransaction(tx.raw)}
                    style={({ pressed }) => [
                      styles.itemRow,
                      {
                        opacity: pressed ? 0.8 : 1,
                        borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
                        borderBottomColor: ui.border,
                      },
                    ]}
                  >
                    <View style={styles.itemBody}>
                      <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
                        {tx.title}
                      </ThemedText>
                      {showMeta && (
                        <>
                          <ThemedText style={[styles.metaText, { color: ui.mutedText }]}>
                            {tx.accountLabel}
                          </ThemedText>
                          {tx.categoryLine && (
                            <ThemedText style={[styles.categoryText, { color: ui.mutedText }]}>
                              {tx.categoryLine}
                            </ThemedText>
                          )}
                        </>
                      )}
                      {showBadges && tx.isPending && (
                        <View style={styles.pendingBadge}>
                          <ThemedText style={styles.pendingText}>Pending</ThemedText>
                        </View>
                      )}
                      {showBadges && tx.recurringLabel && (
                        <View
                          style={[
                            styles.recurringBadge,
                            {
                              backgroundColor: tx.isRecurringActive
                                ? "rgba(255,149,0,0.16)"
                                : "rgba(90,90,90,0.14)",
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.recurringText,
                              {
                                color: tx.isRecurringActive ? "#FF9500" : ui.mutedText,
                              },
                            ]}
                          >
                            {tx.recurringLabel}
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.amountWrap}>
                      <Feather
                        name={isInflow ? "arrow-up-right" : "arrow-down-right"}
                        size={16}
                        color={amountColor}
                      />
                      <ThemedText style={[styles.amountText, { color: amountColor }]}>
                        {formatMoney(amountValue)}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15.5,
    paddingVertical: 0,
    fontFamily: Tokens.font.family,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  metaText: {
    fontSize: 12.5,
    fontFamily: Tokens.font.family,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: Tokens.font.family,
  },
  pendingBadge: {
    backgroundColor: "rgba(255,149,0,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  pendingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF9500",
  },
  recurringBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  recurringText: {
    fontSize: 10,
    fontWeight: "600",
  },
  amountWrap: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginLeft: 10,
  },
  amountText: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
});
