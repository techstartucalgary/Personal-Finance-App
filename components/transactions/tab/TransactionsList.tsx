import React, { useMemo } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { PlaidTransaction } from "@/utils/plaid";

import { styles } from "./styles";
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

// Renders the combined list of manual and Plaid-synced transactions.
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

  return (
    <>
      {filteredExpenses.length === 0 ? (
        <ThemedText style={{ color: ui.mutedText }}>
          {isLoading ? "Loading…" : "No transactions found."}
        </ThemedText>
      ) : (
        filteredExpenses.map((expense) => (
          <ManualExpenseRow
            key={expense.id}
            expense={expense}
            recurringRules={recurringRules}
            ui={ui}
            formatDate={formatDate}
            formatMoney={formatMoney}
            onPress={() => onSelectTransaction(expense)}
          />
        ))
      )}

      {showPlaidSection && (
        <>
          {filterAccountId === null && (
            <View style={{ marginTop: 16, marginBottom: 8 }}>
              <ThemedText
                type="defaultSemiBold"
                style={{
                  color: ui.mutedText,
                  fontSize: 13,
                  letterSpacing: 0.5,
                }}
              >
                BANK TRANSACTIONS
              </ThemedText>
            </View>
          )}
          {filteredPlaidTransactions.map((transaction) => (
            <PlaidTransactionRow
              key={transaction.transaction_id}
              transaction={transaction}
              ui={ui}
              formatDate={formatDate}
              formatMoney={formatMoney}
              onPress={() => onSelectTransaction(transaction)}
            />
          ))}
        </>
      )}
    </>
  );
}

type ManualExpenseRowProps = {
  expense: ExpenseRow;
  recurringRules: RecurringRule[];
  ui: TransactionsUi;
  formatDate: (value?: string | null) => string;
  formatMoney: (value?: number | null) => string;
  onPress: () => void;
};

// Single manual expense row with optional recurring badge.
function ManualExpenseRow({
  expense,
  recurringRules,
  ui,
  formatDate,
  formatMoney,
  onPress,
}: ManualExpenseRowProps) {
  const linkedRule = recurringRules.find(
    (rule) => rule.id === expense.recurring_rule_id,
  );
  const recurringColor = linkedRule?.is_active ? ui.accent : ui.mutedText;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: ui.border,
          backgroundColor: ui.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
            {expense.description ?? "Transaction"}
          </ThemedText>
          {linkedRule && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <IconSymbol
                name="arrow.triangle.2.circlepath"
                size={12}
                color={recurringColor}
              />
              <ThemedText
                style={{
                  color: recurringColor,
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                {linkedRule.is_active ? "Active" : "Inactive"}
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="default" style={{ color: ui.mutedText }}>
          {formatDate(expense.transaction_date || expense.created_at)}
        </ThemedText>
      </View>
      <ThemedText type="defaultSemiBold" style={{ color: ui.negative }}>
        {formatMoney(expense.amount ?? 0)}
      </ThemedText>
    </Pressable>
  );
}

type PlaidTransactionRowProps = {
  transaction: PlaidTransaction;
  ui: TransactionsUi;
  formatDate: (value?: string | null) => string;
  formatMoney: (value?: number | null) => string;
  onPress: () => void;
};

// Single Plaid transaction row with pending status and account metadata.
function PlaidTransactionRow({
  transaction,
  ui,
  formatDate,
  formatMoney,
  onPress,
}: PlaidTransactionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: ui.border,
          backgroundColor: ui.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
            {transaction.merchant_name || transaction.name}
          </ThemedText>
          {transaction.pending && (
            <View
              style={{
                backgroundColor: ui.accentSoft,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <ThemedText
                style={{ fontSize: 10, color: ui.accent, fontWeight: "600" }}
              >
                PENDING
              </ThemedText>
            </View>
          )}
        </View>

        {transaction.institution_name && (
          <ThemedText
            style={{
              fontSize: 10,
              color: ui.accent,
              fontWeight: "700",
              letterSpacing: 0.5,
              marginTop: 1,
            }}
          >
            {transaction.institution_name.toUpperCase()}
          </ThemedText>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <ThemedText type="default" style={{ color: ui.mutedText, fontSize: 13 }}>
            {formatDate(transaction.date)}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 11,
              color: ui.mutedText,
              fontWeight: "500",
            }}
          >
            {[
              transaction.account_name,
              transaction.account_mask ? `••${transaction.account_mask}` : null,
            ]
              .filter(Boolean)
              .join(" ")}
          </ThemedText>
        </View>

        {transaction.category && transaction.category.length > 0 && (
          <ThemedText style={{ color: ui.mutedText, fontSize: 12, marginTop: 2 }}>
            {transaction.category.join(" › ")}
          </ThemedText>
        )}
      </View>
      <ThemedText
        type="defaultSemiBold"
        style={{
          color: transaction.amount > 0 ? ui.negative : ui.positive,
        }}
      >
        {transaction.amount > 0 ? "-" : "+"}
        {formatMoney(Math.abs(transaction.amount))}
      </ThemedText>
    </Pressable>
  );
}
