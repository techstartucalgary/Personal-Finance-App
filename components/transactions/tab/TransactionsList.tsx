import Feather from "@expo/vector-icons/Feather";
import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { getBrandStyle } from "@/components/accounts/AccountCardCarousel";
import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";
import type { PlaidTransaction } from "@/utils/plaid";

import type {
  ExpenseRow,
  FilterAccountId,
  RecurringRule,
  TransactionsUi,
} from "./types";

type TransactionsListProps = {
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

  const showPlaidSection =
    plaidTransactions.length > 0 &&
    (filterAccountId === null ||
      (typeof filterAccountId === "string" &&
        filterAccountId.startsWith("plaid:")));

  const filteredPlaidTransactions = useMemo(() => {
    if (!showPlaidSection) return [] as PlaidTransaction[];

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
  }, [plaidTransactions, filterAccountId, searchQuery, showPlaidSection]);

  if (filteredExpenses.length === 0 && filteredPlaidTransactions.length === 0) {
    return (
      <ThemedText style={{ color: ui.mutedText }}>
        {isLoading ? "Loading..." : "No transactions found."}
      </ThemedText>
    );
  }

  return (
    <View style={localStyles.root}>
      {filteredExpenses.map((expense, index) => {
        const linkedRule = recurringRules.find(
          (rule) => rule.id === expense.recurring_rule_id,
        );

        return (
          <TransactionCard
            key={expense.id}
            color={getManualTransactionColor(expense.amount, index)}
            title={expense.description ?? "Transaction"}
            metaPrimary={formatDate(expense.transaction_date || expense.created_at)}
            metaSecondary={
              linkedRule
                ? `Recurring ${linkedRule.is_active ? "active" : "paused"}`
                : null
            }
            subtitle={linkedRule ? "Self managed recurring transaction" : "Self managed transaction"}
            amount={formatSignedMoney(expense.amount, formatMoney)}
            sourceLabel="Manual"
            icon="credit-card"
            onPress={() => onSelectTransaction(expense)}
          />
        );
      })}

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
            metaPrimary={formatDate(transaction.date)}
            metaSecondary={
              transaction.pending
                ? "Pending"
                : transaction.account_mask
                  ? `Account ${transaction.account_mask}`
                  : transaction.institution_name
            }
            subtitle={categoryLabel}
            amount={formatSignedMoney(transaction.amount, formatMoney)}
            sourceLabel="Plaid"
            icon="link"
            onPress={() => onSelectTransaction(transaction)}
          />
        );
      })}
    </View>
  );
}

const localStyles = StyleSheet.create({
  root: {
    gap: 12,
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
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
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
