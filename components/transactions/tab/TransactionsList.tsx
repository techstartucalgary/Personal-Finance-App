import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { getBrandStyle } from "@/components/accounts/AccountCardCarousel";
import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";
import type { PlaidTransaction } from "@/utils/plaid";

import type {
  AccountRow,
  ExpenseRow,
  FilterAccountId,
  RecurringRule,
  TransactionsUi,
} from "./types";

type TransactionsListProps = {
  accounts: AccountRow[];
  expenses: ExpenseRow[];
  plaidTransactions: PlaidTransaction[];
  recurringRules: RecurringRule[];
  filterAccountId: FilterAccountId;
  searchQuery: string;
  isLoading: boolean;
  onSelectTransaction: (transaction: ExpenseRow | PlaidTransaction) => void;
  ui: TransactionsUi;
  formatDate: (value?: string | null) => string;
  formatMoney: (value?: number | null) => string;
};

const MANUAL_OUTFLOW_PALETTE = ["#701D26", "#8A2431", "#5A1520", "#9B2B3A"];
const MANUAL_INFLOW_PALETTE = ["#2F2F35", "#3A3A42", "#25252B", "#4B4B53"];

const CHEVRON_TIMING_CONFIG = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
};

const ACCORDION_OPEN_HEIGHT_TIMING_CONFIG = {
  duration: 190,
  easing: Easing.out(Easing.cubic),
};

const ACCORDION_CLOSE_HEIGHT_TIMING_CONFIG = {
  duration: 200,
  easing: Easing.inOut(Easing.quad),
};

const ACCORDION_OPEN_OPACITY_TIMING_CONFIG = {
  duration: 130,
  easing: Easing.out(Easing.quad),
};

const ACCORDION_CLOSE_OPACITY_TIMING_CONFIG = {
  duration: 180,
  easing: Easing.inOut(Easing.quad),
};

function SectionChevron({
  collapsed,
  color,
}: {
  collapsed: boolean;
  color: string;
}) {
  const rotation = useSharedValue(collapsed ? 0 : 1);

  useEffect(() => {
    rotation.value = withTiming(collapsed ? 0 : 1, CHEVRON_TIMING_CONFIG);
  }, [collapsed, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather name="chevron-down" size={18} color={color} />
    </Animated.View>
  );
}

function AccordionBody({
  expanded,
  borderColor,
  children,
}: {
  expanded: boolean;
  borderColor: string;
  children: React.ReactNode;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(expanded ? contentHeight : 0);
  const opacity = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(
      expanded ? contentHeight : 0,
      expanded
        ? ACCORDION_OPEN_HEIGHT_TIMING_CONFIG
        : ACCORDION_CLOSE_HEIGHT_TIMING_CONFIG,
    );
    opacity.value = withTiming(
      expanded ? 1 : 0,
      expanded
        ? ACCORDION_OPEN_OPACITY_TIMING_CONFIG
        : ACCORDION_CLOSE_OPACITY_TIMING_CONFIG,
    );
  }, [contentHeight, expanded, height, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: "hidden",
  }));

  return (
    <Animated.View
      pointerEvents={expanded ? "auto" : "none"}
      style={animatedStyle}
    >
      <View
        onLayout={(event) => {
          const nextHeight = Math.ceil(event.nativeEvent.layout.height);
          if (nextHeight !== contentHeight) {
            setContentHeight(nextHeight);
          }
        }}
        style={[
          localStyles.sectionContent,
          { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: borderColor },
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );
}

type TransactionCardProps = {
  color: string;
  title: string;
  metaPrimary: string;
  metaSecondary?: string | null;
  subtitle: string;
  amount: string;
  sourceLabel: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
};

function TransactionCard({
  color,
  title,
  metaPrimary,
  metaSecondary,
  subtitle,
  amount,
  sourceLabel,
  icon,
  onPress,
}: TransactionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.card,
        { backgroundColor: color, opacity: pressed ? 0.93 : 1 },
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={require("../../../assets/images/accounts-vector.png")}
          style={localStyles.waveImage}
          resizeMode="cover"
        />
      </View>

      <View style={localStyles.topRow}>
        <View style={localStyles.titleGroup}>
          <ThemedText style={localStyles.eyebrow}>{sourceLabel}</ThemedText>
          <ThemedText style={localStyles.cardName} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </ThemedText>
          <View style={localStyles.metaRow}>
            <ThemedText style={localStyles.metaText} numberOfLines={1} ellipsizeMode="tail">
              {metaPrimary}
            </ThemedText>
            {metaSecondary ? (
              <>
                <View style={localStyles.metaDot} />
                <ThemedText style={localStyles.metaText} numberOfLines={1} ellipsizeMode="tail">
                  {metaSecondary}
                </ThemedText>
              </>
            ) : null}
          </View>
        </View>
        <View style={localStyles.iconCircle}>
          <Feather name={icon} size={17} color="#FFFFFF" />
        </View>
      </View>

      <View style={localStyles.balanceBlock}>
        <ThemedText style={localStyles.balance}>{amount}</ThemedText>
      </View>

      <View style={localStyles.bottomRow}>
        <View style={localStyles.bottomMeta}>
          <ThemedText style={localStyles.subtitle} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </ThemedText>
        </View>
        <View style={localStyles.sourceChip}>
          <ThemedText style={localStyles.sourceChipText}>{sourceLabel}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({
  ui,
  message,
}: {
  ui: TransactionsUi;
  message: string;
}) {
  return (
    <View
      style={[
        localStyles.emptyState,
        { borderColor: ui.border, backgroundColor: ui.surface2 },
      ]}
    >
      <ThemedText style={{ color: ui.text }}>{message}</ThemedText>
    </View>
  );
}

function formatSignedMoney(
  amount: number | null | undefined,
  formatMoney: (value?: number | null) => string,
) {
  const value = amount ?? 0;
  const prefix = value > 0 ? "-" : value < 0 ? "+" : "";
  return `${prefix}${formatMoney(Math.abs(value))}`;
}

function getManualTransactionColor(amount: number | null | undefined, index: number) {
  const palette = (amount ?? 0) > 0 ? MANUAL_OUTFLOW_PALETTE : MANUAL_INFLOW_PALETTE;
  return palette[index % palette.length];
}

export function TransactionsList({
  accounts,
  expenses,
  plaidTransactions,
  recurringRules,
  filterAccountId,
  searchQuery,
  isLoading,
  onSelectTransaction,
  ui,
  formatDate,
  formatMoney,
}: TransactionsListProps) {
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const [linkedCollapsed, setLinkedCollapsed] = useState(false);

  const accountNamesById = useMemo(
    () =>
      new Map(
        accounts.map((account) => [account.id, account.account_name ?? "Account"]),
      ),
    [accounts],
  );

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((expense) => {
        const matchesAccount =
          filterAccountId === null || expense.account_id === filterAccountId;
        const matchesSearch =
          !searchQuery ||
          expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.amount?.toString().includes(searchQuery);
        return matchesAccount && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.transaction_date || a.created_at || 0).getTime();
        const dateB = new Date(b.transaction_date || b.created_at || 0).getTime();
        return dateB - dateA;
      });
  }, [expenses, filterAccountId, searchQuery]);

  const filteredPlaidTransactions = useMemo(() => {
    return plaidTransactions
      .filter((transaction) => {
        let matchesAccount = true;
        if (filterAccountId !== null) {
          if (
            typeof filterAccountId === "string" &&
            filterAccountId.startsWith("plaid:")
          ) {
            matchesAccount =
              transaction.account_id === filterAccountId.replace("plaid:", "");
          } else {
            matchesAccount = false;
          }
        }

        const matchesSearch =
          !searchQuery ||
          (transaction.merchant_name || transaction.name)
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          transaction.amount?.toString().includes(searchQuery);

        return matchesAccount && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
  }, [plaidTransactions, filterAccountId, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!isSearching) return;
    if (filteredExpenses.length > 0) setManualCollapsed(false);
    if (filteredPlaidTransactions.length > 0) setLinkedCollapsed(false);
  }, [filteredExpenses.length, filteredPlaidTransactions.length, isSearching]);

  return (
    <View style={localStyles.root}>
      <Animated.View
        style={[localStyles.sectionPanel, { backgroundColor: ui.surface, borderColor: ui.border }]}
      >
        <Pressable
          onPress={() => setManualCollapsed((prev) => !prev)}
          style={localStyles.sectionToggle}
        >
          <ThemedText style={[localStyles.sectionTitle, { color: ui.text }]}>
            Self Managed
          </ThemedText>
          <View style={localStyles.sectionToggleRight}>
            <ThemedText style={[localStyles.sectionSubtitle, { color: ui.mutedText }]}>
              {filteredExpenses.length}
            </ThemedText>
            <SectionChevron collapsed={manualCollapsed} color={ui.mutedText} />
          </View>
        </Pressable>

        <AccordionBody expanded={!manualCollapsed} borderColor={ui.border}>
          {filteredExpenses.length === 0 ? (
            <EmptyState
              ui={ui}
              message={isLoading ? "Loading..." : "No matches found."}
            />
          ) : (
            <View style={localStyles.cardStack}>
              {filteredExpenses.map((expense, index) => {
                const linkedRule = recurringRules.find(
                  (rule) => rule.id === expense.recurring_rule_id,
                );
                const accountName = accountNamesById.get(expense.account_id ?? -1) ?? "Account";

                return (
                  <TransactionCard
                    key={expense.id}
                    color={getManualTransactionColor(expense.amount, index)}
                    title={expense.description ?? "Transaction"}
                    metaPrimary={accountName}
                    metaSecondary={
                      linkedRule
                        ? `Recurring ${linkedRule.is_active ? "active" : "paused"}`
                        : null
                    }
                    subtitle={formatDate(expense.transaction_date || expense.created_at)}
                    amount={formatSignedMoney(expense.amount, formatMoney)}
                    sourceLabel="Manual"
                    icon="credit-card"
                    onPress={() => onSelectTransaction(expense)}
                  />
                );
              })}
            </View>
          )}
        </AccordionBody>
      </Animated.View>

      <Animated.View
        style={[localStyles.sectionPanel, { backgroundColor: ui.surface, borderColor: ui.border }]}
      >
        <Pressable
          onPress={() => setLinkedCollapsed((prev) => !prev)}
          style={localStyles.sectionToggle}
        >
          <ThemedText style={[localStyles.sectionTitle, { color: ui.text }]}>
            Linked
          </ThemedText>
          <View style={localStyles.sectionToggleRight}>
            <ThemedText style={[localStyles.sectionSubtitle, { color: ui.mutedText }]}>
              {filteredPlaidTransactions.length}
            </ThemedText>
            <SectionChevron collapsed={linkedCollapsed} color={ui.mutedText} />
          </View>
        </Pressable>

        <AccordionBody expanded={!linkedCollapsed} borderColor={ui.border}>
          {filteredPlaidTransactions.length === 0 ? (
            <EmptyState
              ui={ui}
              message={isLoading ? "Loading..." : "No linked transactions found."}
            />
          ) : (
            <View style={localStyles.cardStack}>
              {filteredPlaidTransactions.map((transaction, index) => {
                const fallbackColor = getManualTransactionColor(transaction.amount, index);
                const brandColor =
                  getBrandStyle(transaction.institution_name)?.color || fallbackColor;
                const categoryLabel =
                  transaction.category && transaction.category.length > 0
                    ? transaction.category.join(" / ")
                    : transaction.account_name || "Bank transaction";

                return (
                  <TransactionCard
                    key={transaction.transaction_id}
                    color={brandColor}
                    title={transaction.merchant_name || transaction.name}
                    metaPrimary={transaction.institution_name || "Linked bank"}
                    metaSecondary={
                      transaction.account_mask
                        ? `Account ${transaction.account_mask}`
                        : transaction.pending
                          ? "Pending"
                          : transaction.account_subtype
                    }
                    subtitle={`${formatDate(transaction.date)} | ${categoryLabel}`}
                    amount={formatSignedMoney(transaction.amount, formatMoney)}
                    sourceLabel="Plaid"
                    icon="link"
                    onPress={() => onSelectTransaction(transaction)}
                  />
                );
              })}
            </View>
          )}
        </AccordionBody>
      </Animated.View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  root: {
    gap: 14,
  },
  sectionPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    overflow: "hidden",
  },
  sectionToggle: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sectionToggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: Tokens.font.family,
  },
  cardStack: {
    gap: 12,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  card: {
    minHeight: 154,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
    justifyContent: "space-between",
    boxShadow: "0 10px 15px rgba(0, 0, 0, 0.25)",
  },
  waveImage: {
    position: "absolute",
    width: 360,
    height: 180,
    right: -30,
    top: 54,
    opacity: 0.72,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    minHeight: 48,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 10.5,
    lineHeight: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 21,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.36)",
  },
  metaText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11.5,
    lineHeight: 14,
    fontFamily: Tokens.font.family,
    flexShrink: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceBlock: {
    marginTop: 6,
  },
  balance: {
    color: "#FFFFFF",
    fontSize: 29,
    lineHeight: 33,
    fontVariant: ["tabular-nums"],
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.family,
  },
  bottomRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bottomMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12.5,
    lineHeight: 15,
    fontFamily: Tokens.font.family,
  },
  sourceChip: {
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  sourceChipText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
});
