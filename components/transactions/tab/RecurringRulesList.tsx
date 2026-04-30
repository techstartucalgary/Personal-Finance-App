import Feather from "@expo/vector-icons/Feather";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";

import type { FilterAccountId, RecurringRule, TransactionsUi } from "./types";

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
    const search = searchQuery.trim().toLowerCase();
    return recurringRules
      .filter((rule) => {
        const matchesAccount =
          filterAccountId === null || rule.account_id === filterAccountId;
        const matchesSearch =
          !search ||
          rule.name?.toLowerCase().includes(search) ||
          rule.frequency?.toLowerCase().includes(search) ||
          rule.amount?.toString().includes(search);
        return matchesAccount && matchesSearch;
      })
      .sort((a, b) => {
        const aActive = a.is_active !== false;
        const bActive = b.is_active !== false;
        if (aActive !== bActive) return aActive ? -1 : 1;
        const dateA = a.next_run_date ? new Date(a.next_run_date).getTime() : 0;
        const dateB = b.next_run_date ? new Date(b.next_run_date).getTime() : 0;
        return dateA - dateB;
      });
  }, [recurringRules, filterAccountId, searchQuery]);

  const sections = useMemo(
    () => [
      {
        key: "active",
        title: "Active Recurrences",
        items: filteredRules.filter((rule) => rule.is_active !== false),
      },
      {
        key: "paused",
        title: "Paused Recurrences",
        items: filteredRules.filter((rule) => rule.is_active === false),
      },
    ].filter((section) => section.items.length > 0),
    [filteredRules],
  );

  if (filteredRules.length === 0) {
    return (
      <ThemedText style={{ color: ui.mutedText }}>
        {isLoading ? "Loading…" : "No recurrences found."}
      </ThemedText>
    );
  }

  return (
    <View style={localStyles.wrap}>
      {sections.map((section) => (
        <View key={section.key} style={localStyles.sectionBlock}>
          <View style={localStyles.sectionHeader}>
            <ThemedText style={[localStyles.sectionTitle, { color: ui.mutedText }]}>
              {section.title}
            </ThemedText>
          </View>
          <View
            style={[
              localStyles.sectionCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            {section.items.map((rule, index) => (
              <RecurringRuleRow
                key={rule.id}
                rule={rule}
                ui={ui}
                formatDate={formatDate}
                formatMoney={formatMoney}
                onPress={() => onEditRule(rule)}
                showDivider={index !== section.items.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

type RecurringRuleRowProps = {
  rule: RecurringRule;
  ui: TransactionsUi;
  formatDate: (value?: string | null) => string;
  formatMoney: (value?: number | null) => string;
  onPress: () => void;
  showDivider: boolean;
};

// Single recurring rule row used inside the Recurring tab.
function RecurringRuleRow({
  rule,
  ui,
  formatDate,
  formatMoney,
  onPress,
  showDivider,
}: RecurringRuleRowProps) {
  const isActive = rule.is_active !== false;
  const nextRun = rule.next_run_date ? formatDate(rule.next_run_date) : "Not scheduled";
  const endDate = rule.end_date ? formatDate(rule.end_date) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.itemRow,
        {
          opacity: pressed ? 0.8 : isActive ? 1 : 0.62,
          borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: ui.border,
        },
      ]}
    >
      <View style={localStyles.iconWrap}>
        <Feather name={isActive ? "repeat" : "pause"} size={16} color="#FFFFFF" />
      </View>

      <View style={localStyles.itemBody}>
        <View style={localStyles.titleRow}>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            style={[localStyles.titleText, { color: ui.text }]}
          >
            {rule.name ?? "Recurring transaction"}
          </ThemedText>
          <View
            style={[
              localStyles.statusBadge,
              {
                backgroundColor: isActive
                  ? "rgba(22,163,74,0.14)"
                  : "rgba(90,90,90,0.14)",
              },
            ]}
          >
            <ThemedText
              style={[
                localStyles.statusText,
                { color: isActive ? "#16A34A" : ui.mutedText },
              ]}
            >
              {isActive ? "Active" : "Paused"}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={[localStyles.metaText, { color: ui.mutedText }]}>
          {rule.frequency ?? "Monthly"} • Next {nextRun}
        </ThemedText>
        {endDate ? (
          <ThemedText style={[localStyles.metaText, { color: ui.mutedText }]}>
            Ends {endDate}
          </ThemedText>
        ) : null}
      </View>

      <View style={localStyles.amountWrap}>
        <ThemedText style={[localStyles.amountText, { color: ui.text }]}>
          {formatMoney(rule.amount ?? 0)}
        </ThemedText>
        <Feather name="chevron-right" size={16} color={ui.mutedText} />
      </View>
    </Pressable>
  );
}

const localStyles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 14,
    letterSpacing: 0.1,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.semiFamily ?? Tokens.font.family,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9500",
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  titleText: {
    flexShrink: 1,
  },
  statusBadge: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 12.5,
    fontFamily: Tokens.font.family,
  },
  amountWrap: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    marginLeft: 6,
  },
  amountText: {
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
});
