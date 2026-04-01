import React, { useMemo } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

import { styles } from "../styles";
import type { FilterAccountId, RecurringRule, TransactionsUi } from "../types";

type RecurringRulesListProps = {
  recurringRules: RecurringRule[];
  filterAccountId: FilterAccountId;
  searchQuery: string;
  isLoading: boolean;
  onEditRule: (rule: RecurringRule) => void;
  ui: TransactionsUi;
  formatDate: (value?: string | null) => string;
  formatMoney: (value?: number | null) => string;
};

// List of recurring rules with active/inactive sorting.
export function RecurringRulesList({
  recurringRules,
  filterAccountId,
  searchQuery,
  isLoading,
  onEditRule,
  ui,
  formatDate,
  formatMoney,
}: RecurringRulesListProps) {
  const filteredRules = useMemo(() => {
    return recurringRules
      .filter((rule) => {
        const matchesAccount =
          filterAccountId === null || rule.account_id === filterAccountId;
        const matchesSearch =
          !searchQuery ||
          rule.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rule.amount?.toString().includes(searchQuery);
        return matchesAccount && matchesSearch;
      })
      .sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
  }, [recurringRules, filterAccountId, searchQuery]);

  if (filteredRules.length === 0) {
    return (
      <ThemedText style={{ padding: 16 }}>
        {isLoading ? "Loading…" : "No recurrences found."}
      </ThemedText>
    );
  }

  return (
    <>
      {filteredRules.map((rule) => (
        <RecurringRuleRow
          key={rule.id}
          rule={rule}
          ui={ui}
          formatDate={formatDate}
          formatMoney={formatMoney}
          onPress={() => onEditRule(rule)}
        />
      ))}
    </>
  );
}

type RecurringRuleRowProps = {
  rule: RecurringRule;
  ui: TransactionsUi;
  formatDate: (value?: string | null) => string;
  formatMoney: (value?: number | null) => string;
  onPress: () => void;
};

// Single recurring rule row used inside the Recurring tab.
function RecurringRuleRow({
  rule,
  ui,
  formatDate,
  formatMoney,
  onPress,
}: RecurringRuleRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: ui.border,
          backgroundColor: ui.surface2,
          opacity: pressed ? 0.7 : rule.is_active ? 1 : 0.6,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">
          {rule.name ?? "Subscription"}
        </ThemedText>
        <ThemedText type="default" style={{ color: ui.mutedText, fontSize: 13 }}>
          {rule.frequency} • {rule.is_active ? "Active" : "Paused"}
        </ThemedText>
        {(rule.is_active || rule.end_date) && (
          <ThemedText type="default" style={{ color: ui.mutedText, fontSize: 13 }}>
            {rule.is_active ? `Next: ${formatDate(rule.next_run_date)}` : ""}
            {rule.is_active && rule.end_date ? " • " : ""}
            {rule.end_date ? `Ends: ${formatDate(rule.end_date)}` : ""}
          </ThemedText>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <ThemedText type="defaultSemiBold">
          {formatMoney(rule.amount ?? 0)}
        </ThemedText>
      </View>
    </Pressable>
  );
}
