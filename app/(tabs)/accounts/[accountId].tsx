import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { AccountDetailModal } from "@/components/AccountDetailModal";
import type { UnifiedAccount } from "@/components/accounts/AccountCardCarousel";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { tabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  deleteAccount as deleteAccountApi,
  updateAccount as updateAccountApi,
} from "@/utils/accounts";
import { listExpenses } from "@/utils/expenses";
import { listGoals } from "@/utils/goals";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import {
  getPlaidAccounts,
  getPlaidTransactions,
  removePlaidItem,
} from "@/utils/plaid";
import { supabase } from "@/utils/supabase";

import { AccountsEditModal } from "./components/AccountsEditModal";
import { AccountsSingleView } from "./components/AccountsSingleView";
import { AccountsLoadingState, AccountsSignedOutState } from "./components/AccountsState";
import { styles } from "./styles";
import type { AccountRow, ExpenseRow, GoalRow } from "./types";

export default function AccountDetailScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const id = accountId;
  const router = useRouter();
  
  const { session, isLoading: authLoading } = useAuthContext();
  const insets = useSafeAreaInsets();
  
  const tabBarHeight = insets.bottom + 60;
  const ui = tabsTheme.ui;

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

  // edit state
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editInterest, setEditInterest] = useState("");
  const [editStatementDate, setEditStatementDate] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDetailAccount, setSelectedDetailAccount] = useState<AccountRow | PlaidAccount | null>(null);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<PlaidTransaction[]>([]);
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<ExpenseRow | PlaidTransaction | null>(null);
  const [isTxDetailVisible, setIsTxDetailVisible] = useState(false);
  const [currentSingleAccountId, setCurrentSingleAccountId] = useState(id);

  // Palette helper
  const getAccountColor = useCallback((item: AccountRow | PlaidAccount, index: number) => {
    const type = (("account_type" in item ? item.account_type : item.type) ?? "").toLowerCase();
    const isDebit = type === "debit" || type === "depository" || type === "checking" || type === "savings";
    const palette = isDebit
      ? ["#701D26", "#8A2431", "#5A1520", "#9B2B3A"]
      : ["#D86666", "#E07A7A", "#C95454", "#E39191"];
    return palette[index % palette.length];
  }, []);

  const loadAccounts = useCallback(async (silent = false) => {
    if (!userId) return;
    const hasData = accounts.length > 0 || goals.length > 0 || plaidAccounts.length > 0;
    if (!silent && !hasData) setIsLoading(true);

    try {
      const [accountsResponse, goalsData, pAccounts] = await Promise.all([
        supabase
          .from("account")
          .select("id, profile_id, created_at, account_name, account_type, balance, credit_limit, statement_duedate, payment_duedate, interest_rate, currency")
          .eq("profile_id", userId)
          .order("created_at", { ascending: false }),
        listGoals({ profile_id: userId }),
        getPlaidAccounts(),
      ]);

      if (accountsResponse.error) throw accountsResponse.error;

      setAccounts((accountsResponse.data as AccountRow[]) ?? []);
      setGoals((goalsData as any[])?.map((g) => ({ ...g })) ?? []);
      setPlaidAccounts(pAccounts ?? []);
    } catch (err) {
      console.error("Error loading extra data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, accounts.length, goals.length, plaidAccounts.length]);

  const loadTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      const [expenseData, plaidData] = await Promise.all([
        listExpenses({ profile_id: userId }),
        getPlaidTransactions(),
      ]);
      setExpenses((expenseData as ExpenseRow[]) ?? []);
      setPlaidTransactions(plaidData ?? []);
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  }, [userId]);

  useEffect(() => {
    loadAccounts(true);
    loadTransactions();
  }, [loadAccounts, loadTransactions]);

  useEffect(() => {
    if (editingAccount) {
      setEditName(editingAccount.account_name ?? "");
      setEditBalance(editingAccount.balance?.toString() ?? "");
      setEditLimit(editingAccount.credit_limit?.toString() ?? "");
      setEditInterest(editingAccount.interest_rate?.toString() ?? "");
      setEditStatementDate(editingAccount.statement_duedate ?? "");
      setEditPaymentDate(editingAccount.payment_duedate ?? "");
      setEditCurrency(editingAccount.currency ?? "CAD");
    }
  }, [editingAccount]);

  const updateAccount = useCallback(async () => {
    if (!userId || !editingAccount) return;
    setIsLoading(true);

    const cleanText = (val: string, fb?: string | null) => (val.trim().length > 0 ? val.trim() : fb ?? undefined);
    const cleanNumber = (val: string, fb?: number | null) => {
      const t = val.trim();
      if (!t.length) return fb ?? 0;
      const parsed = parseFloat(t);
      return Number.isFinite(parsed) ? parsed : (fb ?? 0);
    };

    const payload = {
      account_name: cleanText(editName, editingAccount.account_name),
      balance: cleanNumber(editBalance, editingAccount.balance),
      credit_limit: cleanNumber(editLimit, editingAccount.credit_limit),
      interest_rate: cleanNumber(editInterest, editingAccount.interest_rate),
      statement_duedate: cleanText(editStatementDate, editingAccount.statement_duedate),
      payment_duedate: cleanText(editPaymentDate, editingAccount.payment_duedate),
      currency: cleanText(editCurrency, editingAccount.currency),
    };

    try {
      await updateAccountApi({ id: editingAccount.id, profile_id: userId, update: payload });
    } catch (error) {
      Alert.alert("Error", "Could not update account");
      setIsLoading(false);
      return;
    }

    setEditingAccount(null);
    setDetailModalVisible(false);
    setSelectedDetailAccount(null);
    await loadAccounts();
    setIsLoading(false);
  }, [userId, editingAccount, editName, editBalance, editLimit, editInterest, editStatementDate, editPaymentDate, editCurrency, loadAccounts]);

  const deleteAccount = useCallback(async (accountId: string) => {
    if (!userId) return;
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          try {
            await deleteAccountApi({ id: accountId, profile_id: userId });
          } catch (e) {
            Alert.alert("Error", "Could not delete account.");
            setIsLoading(false);
            return;
          }
          await loadAccounts();
          setEditingAccount(null);
          setDetailModalVisible(false);
          setSelectedDetailAccount(null);
          setIsLoading(false);
          router.back();
        },
      },
    ]);
  }, [userId, loadAccounts, router]);

  const calculateAvailable = useCallback((acc: AccountRow) => {
    const total = acc.balance ?? 0;
    const allocated = goals.filter(g => g.linked_account === Number(acc.id)).reduce((s, g) => s + (g.current_amount ?? 0), 0);
    return total - allocated;
  }, [goals]);

  const calculatePlaidAvailable = useCallback((pa: PlaidAccount) => {
    const total = pa.balances.current ?? 0;
    const allocated = goals.filter(g => g.linked_plaid_account === pa.account_id).reduce((s, g) => s + (g.current_amount ?? 0), 0);
    return total - allocated;
  }, [goals]);

  const formatMoney = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
  }, []);

  const combinedAccounts = useMemo(() => {
    const manual = accounts.map((acc) => ({ id: `manual:${acc.id}`, kind: "manual" as const, raw: acc, label: acc.account_name ?? "Account" }));
    const plaid = plaidAccounts.map((pa) => ({ id: `plaid:${pa.account_id}`, kind: "plaid" as const, raw: pa, label: pa.name }));
    return [...manual, ...plaid];
  }, [accounts, plaidAccounts]);

  const unifiedAccounts: UnifiedAccount[] = useMemo(() => {
    return combinedAccounts.map((item, index) => {
      if (item.kind === "manual") {
        const acc = item.raw as AccountRow;
        const available = calculateAvailable(acc);
        return {
          key: item.id,
          kind: "manual",
          color: getAccountColor(acc, index),
          name: acc.account_name ?? "Unnamed Account",
          balance: formatMoney(acc.balance ?? 0),
          availableBalance: formatMoney(available),
          typeLabel: (acc.account_type ?? "account").charAt(0).toUpperCase() + (acc.account_type ?? "account").slice(1),
          subtitle: acc.currency ?? "CAD",
          sourceLabel: "Manual",
          data: acc,
        };
      }
      const pa = item.raw as PlaidAccount;
      const available = calculatePlaidAvailable(pa);
      const sub = pa.subtype ? pa.subtype.charAt(0).toUpperCase() + pa.subtype.slice(1) : "Bank";
      return {
        key: item.id,
        kind: "plaid",
        color: getAccountColor(pa, index),
        name: pa.name,
        balance: formatMoney(pa.balances.current ?? 0),
        availableBalance: formatMoney(pa.balances.available ?? available),
        typeLabel: (pa.type ?? "account").charAt(0).toUpperCase() + (pa.type ?? "account").slice(1),
        subtitle: sub,
        sourceLabel: "Plaid",
        institutionName: pa.institution_name,
        mask: pa.mask,
        data: pa,
      };
    });
  }, [combinedAccounts, calculateAvailable, calculatePlaidAvailable, formatMoney, getAccountColor]);

  // Handle active card correctly so we start on the right swiper view
  const activeCardIndex = useMemo(() => {
    if (!combinedAccounts.length) return 0;
    const idx = combinedAccounts.findIndex((acc) => acc.id === currentSingleAccountId);
    return idx >= 0 ? idx : 0;
  }, [combinedAccounts, currentSingleAccountId]);

  const selectedFilterId = useMemo(() => {
    const selected = combinedAccounts.find(a => a.id === currentSingleAccountId);
    if (!selected) return null;
    if (selected.kind === "manual") return Number((selected.raw as AccountRow).id);
    return `plaid:${(selected.raw as PlaidAccount).account_id}`;
  }, [combinedAccounts, currentSingleAccountId]);

  const handleSingleDelete = useCallback(() => {
    const selected = combinedAccounts.find(a => a.id === currentSingleAccountId);
    if (!selected) return;
    if (selected.kind === "manual") {
      deleteAccount((selected.raw as AccountRow).id);
      return;
    }
    const pa = selected.raw as PlaidAccount;
    Alert.alert("Unlink", "Are you sure you want to unlink this account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Unlink", style: "destructive", onPress: async () => {
          try {
            await removePlaidItem(pa.plaid_item_id);
            router.back();
          } catch (e) {
            Alert.alert("Error", "Could not unlink account.");
          }
      }}
    ])
  }, [deleteAccount, router, combinedAccounts, currentSingleAccountId]);

  const handleSingleEdit = useCallback(() => {
    const selected = combinedAccounts.find(a => a.id === currentSingleAccountId);
    if (!selected) return;
    setSelectedDetailAccount(selected.raw as AccountRow | PlaidAccount);
    setDetailModalVisible(true);
  }, [combinedAccounts, currentSingleAccountId]);

  const accountsForTx = useMemo(() => {
    return accounts.map(a => ({ id: Number(a.id), account_name: a.account_name, account_type: a.account_type, balance: a.balance, currency: a.currency })).filter(a => Number.isFinite(a.id));
  }, [accounts]);

  const filteredExpensesForSingle = useMemo(() => {
    if (selectedFilterId == null) return expenses;
    if (typeof selectedFilterId === "number") return expenses.filter((e) => Number(e.account_id) === selectedFilterId);
    return [];
  }, [expenses, selectedFilterId]);

  const filteredPlaidForSingle = useMemo(() => {
    if (selectedFilterId == null) return plaidTransactions;
    if (typeof selectedFilterId === "string" && selectedFilterId.startsWith("plaid:")) {
      const plaidId = selectedFilterId.replace("plaid:", "");
      return plaidTransactions.filter((tx) => tx.account_id === plaidId);
    }
    return [];
  }, [plaidTransactions, selectedFilterId]);


  if (authLoading && !session) return <AccountsLoadingState ui={ui} insets={insets} />;
  if (!session) return <AccountsSignedOutState ui={ui} insets={insets} />;

  return (
    <>
      <Stack.Screen
        options={{
          headerLargeTitle: false,
          headerTitle: "Account Details",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView
        style={[styles.screen, { backgroundColor: ui.bg }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: 16,
            paddingBottom: tabBarHeight + 60,
            paddingTop: 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              loadAccounts();
              loadTransactions();
            }}
            tintColor={ui.text}
          />
        }
      >
        <AccountsSingleView
          ui={ui}
          isLoading={isLoading}
          combinedAccounts={combinedAccounts}
          unifiedAccounts={unifiedAccounts}
          activeCardIndex={activeCardIndex}
          singleAccountId={currentSingleAccountId}
          txSearchQuery={txSearchQuery}
          filteredExpenses={filteredExpensesForSingle}
          filteredPlaidTransactions={filteredPlaidForSingle}
          accountsForTx={accountsForTx}
          plaidAccounts={plaidAccounts}
          onSingleAccountChange={(newId) => setCurrentSingleAccountId(newId)}
          onOpenAddSource={() => {}} // Remove ability to add source from details since it's cleaner on parent list view
          onDeleteSelected={handleSingleDelete}
          onEditSelected={handleSingleEdit}
          onTxSearchChange={setTxSearchQuery}
          onSelectTransaction={(tx) => {
            setSelectedTransaction(tx);
            setIsTxDetailVisible(true);
          }}
        />
      </ScrollView>

      <TransactionDetailModal
        visible={isTxDetailVisible}
        onClose={() => {
          setIsTxDetailVisible(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        accounts={accountsForTx}
      />

      <AccountDetailModal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedDetailAccount(null);
        }}
        account={selectedDetailAccount as any}
        availableBalance={
          selectedDetailAccount
            ? "account_id" in selectedDetailAccount
              ? calculatePlaidAvailable(selectedDetailAccount as PlaidAccount)
              : calculateAvailable(selectedDetailAccount as AccountRow)
            : null
        }
        onEdit={(acc: any) => setEditingAccount(acc as AccountRow)}
        onUnlink={(pa: any) => {
          Alert.alert("Unlink", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unlink", style: "destructive", onPress: async () => {
                setDetailModalVisible(false);
                try {
                  await removePlaidItem(pa.plaid_item_id);
                  router.back();
                } catch (e) {
                  Alert.alert("Error", "Could not unlink account.");
                }
              }
            }
          ])
        }}
      >
        <AccountsEditModal
          visible={!!editingAccount}
          ui={ui}
          insets={insets}
          editName={editName}
          editBalance={editBalance}
          editLimit={editLimit}
          editInterest={editInterest}
          editStatementDate={editStatementDate}
          editPaymentDate={editPaymentDate}
          editCurrency={editCurrency}
          isLoading={isLoading}
          onClose={() => setEditingAccount(null)}
          onSubmit={updateAccount}
          onDelete={() => editingAccount && deleteAccount(editingAccount.id)}
          onNameChange={setEditName}
          onBalanceChange={setEditBalance}
          onLimitChange={setEditLimit}
          onInterestChange={setEditInterest}
          onStatementDateChange={setEditStatementDate}
          onPaymentDateChange={setEditPaymentDate}
          onCurrencyChange={setEditCurrency}
        />
      </AccountDetailModal>
    </>
  );
}
