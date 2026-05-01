import React from "react";
import { Pressable, ScrollView } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { PlaidAccount } from "@/utils/plaid";

import { styles } from "./styles";
import type { AccountRow, FilterAccountId, TransactionsUi } from "./types";

type AccountFilterChipsProps = {
  accounts: AccountRow[];
  plaidAccounts: PlaidAccount[];
  filterAccountId: FilterAccountId;
  onSelect: (nextId: FilterAccountId) => void;
  ui: TransactionsUi;
};

// Horizontal chip list for filtering by local or Plaid-linked accounts.
export function AccountFilterChips({
  accounts,
  plaidAccounts,
  filterAccountId,
  onSelect,
  ui,
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
            backgroundColor: filterAccountId === null ? ui.accent : ui.surface,
            borderColor: filterAccountId === null ? ui.accent : ui.border,
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
          key={acct.id}
          onPress={() => onSelect(acct.id)}
          style={[
            styles.chip,
            {
              backgroundColor: filterAccountId === acct.id ? ui.accent : ui.surface,
              borderColor: filterAccountId === acct.id ? ui.accent : ui.border,
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
                backgroundColor: isSelected ? ui.accent : ui.surface,
                borderColor: isSelected ? ui.accent : ui.border,
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
              {account.name}
              {account.mask ? ` ••${account.mask}` : ""}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
