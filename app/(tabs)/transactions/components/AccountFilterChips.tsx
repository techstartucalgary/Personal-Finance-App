import React from "react";
import { Pressable, ScrollView } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { PlaidAccount } from "@/utils/plaid";

import { styles } from "../styles";
import type { AccountRow, FilterAccountId, TransactionsUi } from "../types";

type AccountFilterChipsProps = {
  accounts: AccountRow[];
  plaidAccounts: PlaidAccount[];
  filterAccountId: FilterAccountId;
  onSelect: (nextId: FilterAccountId) => void;
  ui: TransactionsUi;
  isAndroid: boolean;
  isDark: boolean;
  androidSelectedBg: string;
  androidSelectedText: string;
};

// Horizontal chip list for filtering by local or Plaid-linked accounts.
export function AccountFilterChips({
  accounts,
  plaidAccounts,
  filterAccountId,
  onSelect,
  ui,
  isAndroid,
  isDark,
  androidSelectedBg,
  androidSelectedText,
}: AccountFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
    >
      <Pressable
        onPress={() => onSelect(null)}
        style={[
          styles.chip,
          {
            backgroundColor:
              filterAccountId === null
                ? isAndroid
                  ? androidSelectedBg
                  : ui.text
                : ui.surface2,
            borderColor: ui.border,
          },
        ]}
      >
        <ThemedText
          style={{
            fontSize: 13,
            fontWeight: "600",
            color:
              filterAccountId === null
                ? isAndroid
                  ? androidSelectedText
                  : ui.surface
                : ui.text,
          }}
        >
          All
        </ThemedText>
      </Pressable>

      {accounts.map((acct) => (
        <Pressable
          key={acct.id}
          onPress={() => onSelect(acct.id)}
          style={[
            styles.chip,
            {
              backgroundColor:
                filterAccountId === acct.id
                  ? isAndroid
                    ? androidSelectedBg
                    : ui.text
                  : ui.surface2,
              borderColor: ui.border,
            },
          ]}
        >
          <ThemedText
            style={{
              fontSize: 13,
              fontWeight: "600",
              color:
                filterAccountId === acct.id
                  ? isAndroid
                    ? androidSelectedText
                    : ui.surface
                  : ui.text,
            }}
          >
            {acct.account_name ?? "Account"}
          </ThemedText>
        </Pressable>
      ))}

      {plaidAccounts.map((account) => {
        const chipId = `plaid:${account.account_id}`;
        const isSelected = filterAccountId === chipId;
        return (
          <Pressable
            key={chipId}
            onPress={() => onSelect(chipId)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? isDark
                    ? "#1F6F5B"
                    : "#2A8A6E"
                  : ui.surface2,
                borderColor: ui.border,
              },
            ]}
          >
            <ThemedText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: isSelected
                  ? "#FFFFFF"
                  : isDark
                    ? "#8CF2D1"
                    : "#1F6F5B",
              }}
            >
              {account.name}
              {account.mask ? ` ••${account.mask}` : ""}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
