import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, View } from "react-native";

import { AccountWaveCard } from "@/components/accounts/AccountCards";
import { ThemedText } from "@/components/themed-text";
import { tabsTheme } from "@/constants/tabsTheme";
import type { PlaidAccount } from "@/utils/plaid";

import { AccountsEmptyState } from "./AccountsEmptyState";
import { AccountsSectionHeader } from "./AccountsSectionHeader";
import { styles } from "./styles";
import type { AccountRow } from "./types";

type Ui = typeof tabsTheme.ui;

type AccountsAllViewProps = {
  ui: Ui;
  isLoading: boolean;
  filteredManualAccounts: AccountRow[];
  filteredPlaidAccounts: PlaidAccount[];
  manualCount: number;
  formatMoney: (amount: number) => string;
  getAccountColor: (item: AccountRow | PlaidAccount, index: number) => string;
  onOpenAddSource: () => void;
  onOpenSingleAccount: (id: string) => void;
};

// Full list view for all accounts + linked banks.
export function AccountsAllView({
  ui,
  isLoading,
  filteredManualAccounts,
  filteredPlaidAccounts,
  manualCount,
  formatMoney,
  getAccountColor,
  onOpenAddSource,
  onOpenSingleAccount,
}: AccountsAllViewProps) {
  return (
    <>
      <Pressable
        onPress={onOpenAddSource}
        style={[
          styles.smallActionBtn,
          { borderColor: ui.border, backgroundColor: ui.surface },
        ]}
      >
        <Feather name="plus" size={16} color={ui.text} />
        <ThemedText style={[styles.actionText, { color: ui.text }]}>
          Add Account
        </ThemedText>
      </Pressable>

      <AccountsSectionHeader ui={ui} title="Self-Managed Accounts" />

      {filteredManualAccounts.length === 0 ? (
        <AccountsEmptyState
          ui={ui}
          message={isLoading ? "Loading..." : "No matches found."}
        />
      ) : (
        filteredManualAccounts.map((item, idx) => {
          const cardProps = {
            title: item.account_name ?? "Unnamed account",
            balance: formatMoney(item.balance ?? 0),
            typeLabel: item.account_type
              ? item.account_type.charAt(0).toUpperCase() +
                item.account_type.slice(1)
              : "-",
            dateLabel: item.currency ?? "CAD",
            color: getAccountColor(item, idx),
            onPress: () => {
              onOpenSingleAccount(`manual:${item.id}`);
            },
          };

          return <AccountWaveCard key={item.id} {...cardProps} />;
        })
      )}

      {/* Linked Banks (Plaid) */}
      {filteredPlaidAccounts.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <AccountsSectionHeader
            ui={ui}
            title="Linked Banks"
            subtitle={`${filteredPlaidAccounts.length} account${
              filteredPlaidAccounts.length !== 1 ? "s" : ""
            }`}
          />

          {filteredPlaidAccounts.map((pa, idx) => {
            const cardProps = {
              title: pa.name,
              balance: formatMoney(pa.balances.current ?? 0),
              typeLabel: pa.type.charAt(0).toUpperCase() + pa.type.slice(1),
              dateLabel: pa.subtype
                ? pa.subtype.charAt(0).toUpperCase() + pa.subtype.slice(1)
                : "Bank",
              color: getAccountColor(pa, idx + manualCount),
              onPress: () => {
                onOpenSingleAccount(`plaid:${pa.account_id}`);
              },
            };
            return (
              <AccountWaveCard
                key={pa.account_id}
                {...cardProps}
                waveAngle={idx % 2 === 0 ? -8 : 8}
              />
            );
          })}
        </View>
      )}
    </>
  );
}
