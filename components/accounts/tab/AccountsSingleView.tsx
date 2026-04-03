import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  AccountCardCarousel,
  type UnifiedAccount,
} from "@/components/accounts/AccountCardCarousel";
import { TransactionsList } from "@/components/transactions/TransactionsList";
import { tabsTheme } from "@/constants/tabsTheme";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";

import { AccountsEmptyState } from "./AccountsEmptyState";
import { AccountsSectionHeader } from "./AccountsSectionHeader";
import { styles } from "./styles";
import type { AccountRow, ExpenseRow } from "./types";

type Ui = typeof tabsTheme.ui;

type CombinedAccount = {
  id: string;
  kind: "manual" | "plaid";
  raw: AccountRow | PlaidAccount;
  label: string;
};

type AccountsSingleViewProps = {
  ui: Ui;
  isLoading: boolean;
  combinedAccounts: CombinedAccount[];
  unifiedAccounts: UnifiedAccount[];
  activeCardIndex: number;
  singleAccountId: string | null;
  txSearchQuery: string;
  filteredExpenses: ExpenseRow[];
  filteredPlaidTransactions: PlaidTransaction[];
  accountsForTx: {
    id: number;
    account_name: string | null;
    account_type: string | null;
    balance: number | null;
    currency: string | null;
  }[];
  plaidAccounts: PlaidAccount[];
  onSingleAccountChange: (id: string) => void;
  onOpenAddSource: () => void;
  onDeleteSelected: () => void;
  onEditSelected: () => void;
  onTxSearchChange: (value: string) => void;
  onSelectTransaction: (tx: ExpenseRow | PlaidTransaction) => void;
};

// Single-account focus view with carousel + transactions.
export function AccountsSingleView({
  ui,
  isLoading,
  combinedAccounts,
  unifiedAccounts,
  activeCardIndex,
  singleAccountId,
  txSearchQuery,
  filteredExpenses,
  filteredPlaidTransactions,
  accountsForTx,
  plaidAccounts,
  onSingleAccountChange,
  onOpenAddSource,
  onDeleteSelected,
  onEditSelected,
  onTxSearchChange,
  onSelectTransaction,
}: AccountsSingleViewProps) {
  const previousIndexRef = useRef(activeCardIndex);
  const transactionShift = useSharedValue(0);
  const transactionOpacity = useSharedValue(1);

  const handleCarouselIndexChange = useCallback((index: number) => {
    const next = combinedAccounts[index];
    if (next && next.id !== singleAccountId) {
      onSingleAccountChange(next.id);
    }
  }, [combinedAccounts, onSingleAccountChange, singleAccountId]);

  const handleAccountPress = useCallback((account: UnifiedAccount) => {
    const next = combinedAccounts.find((acc) => acc.id === account.key);
    if (next && next.id !== singleAccountId) {
      onSingleAccountChange(next.id);
    }
  }, [combinedAccounts, onSingleAccountChange, singleAccountId]);

  useEffect(() => {
    const direction = activeCardIndex >= previousIndexRef.current ? 1 : -1;
    previousIndexRef.current = activeCardIndex;

    cancelAnimation(transactionShift);
    cancelAnimation(transactionOpacity);

    transactionShift.value = direction * 8;
    transactionOpacity.value = 0.9;

    transactionShift.value = withTiming(0, { duration: 400 });
    transactionOpacity.value = withTiming(1, { duration: 220 });
  }, [activeCardIndex, transactionOpacity, transactionShift]);

  const transactionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: transactionOpacity.value,
    transform: [{ translateX: transactionShift.value }],
  }));

  if (combinedAccounts.length === 0) {
    return (
      <View style={styles.singleViewWrap}>
        <AccountsEmptyState
          ui={ui}
          message={isLoading ? "Loading..." : "No accounts yet."}
        />
      </View>
    );
  }

  return (
    <View style={styles.singleViewWrap}>
      <AccountCardCarousel
        accounts={unifiedAccounts}
        activeIndex={activeCardIndex}
        onIndexChange={handleCarouselIndexChange}
        onAddPress={onOpenAddSource}
        onAccountPress={handleAccountPress}
        ui={ui}
      />

      <View style={styles.cardActions}>
        <Pressable
          style={[
            styles.actionCircle,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
          onPress={onDeleteSelected}
        >
          <Feather name="trash-2" size={16} color={ui.danger} />
        </Pressable>
        <Pressable
          style={[
            styles.actionCircle,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
          onPress={onOpenAddSource}
        >
          <Feather name="plus" size={18} color={ui.text} />
        </Pressable>
        <Pressable
          style={[
            styles.actionCircle,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
          onPress={onEditSelected}
        >
          <Feather name="edit-2" size={16} color={ui.text} />
        </Pressable>
      </View>

      <Animated.View style={transactionAnimatedStyle}>
        <AccountsSectionHeader ui={ui} title="Transactions" />

        <TransactionsList
          ui={ui}
          expenses={filteredExpenses}
          plaidTransactions={filteredPlaidTransactions}
          recurringRules={[]}
          accounts={accountsForTx}
          plaidAccounts={plaidAccounts}
          filterAccountId={null}
          onFilterAccountChange={() => { }}
          searchQuery={txSearchQuery}
          onSearchQueryChange={onTxSearchChange}
          onSelectTransaction={onSelectTransaction}
          isLoading={isLoading}
          showSearch={false}
          showFilters={false}
          showMeta={false}
          showBadges={false}
        />
      </Animated.View>
    </View>
  );
}
