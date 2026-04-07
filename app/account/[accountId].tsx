import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";

import type { UnifiedAccount } from "@/components/accounts/AccountCardCarousel";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  createAccount as createAccountApi,
  deleteAccount as deleteAccountApi,
} from "@/utils/accounts";
import { listExpenses } from "@/utils/expenses";
import { listGoals } from "@/utils/goals";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import {
  exchangePublicToken,
  getPlaidAccounts,
  getLinkToken,
  getPlaidTransactions,
  removePlaidItem,
} from "@/utils/plaid";
import { supabase } from "@/utils/supabase";

import { AccountsSingleView } from "@/components/accounts/tab/AccountsSingleView";
import { AccountsLoadingState, AccountsSignedOutState } from "@/components/accounts/tab/AccountsState";
import { styles } from "@/components/accounts/tab/styles";
import type { AccountRow, AccountType, ExpenseRow, GoalRow } from "@/components/accounts/tab/types";

const ACCOUNT_DETAILS_SUMMARY_TTL_MS = 60_000;
const ACCOUNT_DETAILS_TRANSACTIONS_TTL_MS = 45_000;

type AccountSummaryData = {
  accounts: AccountRow[];
  goals: GoalRow[];
};

type AccountTransactionData = {
  expenses: ExpenseRow[];
  plaidTransactions: PlaidTransaction[];
};

type CacheEntry<T> = {
  updatedAt: number;
  data: T;
};

const accountSummaryCache = new Map<string, CacheEntry<AccountSummaryData>>();
const plaidAccountsCache = new Map<string, CacheEntry<PlaidAccount[]>>();
const accountTransactionCache = new Map<string, CacheEntry<AccountTransactionData>>();
const accountSummaryInflight = new Map<string, Promise<AccountSummaryData>>();
const plaidAccountsInflight = new Map<string, Promise<PlaidAccount[]>>();
const accountTransactionInflight = new Map<string, Promise<AccountTransactionData>>();

function isFresh<T>(entry: CacheEntry<T> | undefined, ttlMs: number) {
  return Boolean(entry && Date.now() - entry.updatedAt < ttlMs);
}

function invalidateAccountDetailCache(userId?: string) {
  if (!userId) return;
  accountSummaryCache.delete(userId);
  plaidAccountsCache.delete(userId);
  accountTransactionCache.delete(userId);
  accountSummaryInflight.delete(userId);
  plaidAccountsInflight.delete(userId);
  accountTransactionInflight.delete(userId);
}

async function fetchAccountSummaryData(userId: string, force = false): Promise<AccountSummaryData> {
  const cached = accountSummaryCache.get(userId);
  if (!force && isFresh(cached, ACCOUNT_DETAILS_SUMMARY_TTL_MS)) {
    return cached!.data;
  }

  if (!force) {
    const inflight = accountSummaryInflight.get(userId);
    if (inflight) return inflight;
  }

  const request = Promise.all([
    supabase
      .from("account")
      .select("id, profile_id, created_at, account_name, account_type, balance, credit_limit, statement_duedate, payment_duedate, interest_rate, currency")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false }),
    listGoals({ profile_id: userId }),
  ]).then(([accountsResponse, goalsData]) => {
    if (accountsResponse.error) throw accountsResponse.error;

    const nextData: AccountSummaryData = {
      accounts: (accountsResponse.data as AccountRow[]) ?? [],
      goals: (goalsData as any[])?.map((g) => ({ ...g })) ?? [],
    };

    accountSummaryCache.set(userId, {
      updatedAt: Date.now(),
      data: nextData,
    });

    return nextData;
  }).finally(() => {
    accountSummaryInflight.delete(userId);
  });

  accountSummaryInflight.set(userId, request);
  return request;
}

async function fetchPlaidAccountsData(userId: string, force = false): Promise<PlaidAccount[]> {
  const cached = plaidAccountsCache.get(userId);
  if (!force && isFresh(cached, ACCOUNT_DETAILS_SUMMARY_TTL_MS)) {
    return cached!.data;
  }

  if (!force) {
    const inflight = plaidAccountsInflight.get(userId);
    if (inflight) return inflight;
  }

  const request = getPlaidAccounts().then((pAccounts) => {
    const nextData = pAccounts ?? [];

    plaidAccountsCache.set(userId, {
      updatedAt: Date.now(),
      data: nextData,
    });

    return nextData;
  }).finally(() => {
    plaidAccountsInflight.delete(userId);
  });

  plaidAccountsInflight.set(userId, request);
  return request;
}

async function fetchAccountTransactionData(userId: string, force = false): Promise<AccountTransactionData> {
  const cached = accountTransactionCache.get(userId);
  if (!force && isFresh(cached, ACCOUNT_DETAILS_TRANSACTIONS_TTL_MS)) {
    return cached!.data;
  }

  if (!force) {
    const inflight = accountTransactionInflight.get(userId);
    if (inflight) return inflight;
  }

  const request = Promise.all([
    listExpenses({ profile_id: userId }),
    getPlaidTransactions(),
  ]).then(([expenseData, plaidData]) => {
    const nextData: AccountTransactionData = {
      expenses: (expenseData as ExpenseRow[]) ?? [],
      plaidTransactions: plaidData ?? [],
    };

    accountTransactionCache.set(userId, {
      updatedAt: Date.now(),
      data: nextData,
    });

    return nextData;
  }).finally(() => {
    accountTransactionInflight.delete(userId);
  });

  accountTransactionInflight.set(userId, request);
  return request;
}

export default function AccountDetailScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const id = accountId;
  const router = useRouter();

  const { session, isLoading: authLoading } = useAuthContext();
  const insets = useSafeAreaInsets();

  const ui = useThemeUI();
  const theme = useTheme();
  const isDark = ui.bg === '#000000' || ui.bg === '#1C1C1E';

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

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

  const loadAccounts = useCallback(async (silent = false, force = false) => {
    if (!userId) return;
    const cachedSummary = accountSummaryCache.get(userId);
    const cachedPlaid = plaidAccountsCache.get(userId);
    const hasCachedData = Boolean(cachedSummary || cachedPlaid);

    if (cachedSummary) {
      setAccounts(cachedSummary.data.accounts);
      setGoals(cachedSummary.data.goals);
    }

    if (cachedPlaid) {
      setPlaidAccounts(cachedPlaid.data);
    }

    if (!silent && !hasCachedData) setIsLoading(true);

    try {
      const nextData = await fetchAccountSummaryData(userId, force);
      setAccounts(nextData.accounts);
      setGoals(nextData.goals);
      setIsLoading(false);

      fetchPlaidAccountsData(userId, force)
        .then((nextPlaidAccounts) => {
          setPlaidAccounts(nextPlaidAccounts);
        })
        .catch((err) => {
          console.error("Error loading Plaid accounts:", err);
          setPlaidAccounts([]);
        });
    } catch (err) {
      console.error("Error loading extra data:", err);
      setIsLoading(false);
    }
  }, [userId]);

  const loadTransactions = useCallback(async (force = false) => {
    if (!userId) return;

    const cached = accountTransactionCache.get(userId);
    if (cached) {
      setExpenses(cached.data.expenses);
      setPlaidTransactions(cached.data.plaidTransactions);
    }

    try {
      const nextData = await fetchAccountTransactionData(userId, force);
      setExpenses(nextData.expenses);
      setPlaidTransactions(nextData.plaidTransactions);
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  }, [userId]);

  useEffect(() => {
    loadAccounts(true);
    loadTransactions();
  }, [loadAccounts, loadTransactions]);

  const deleteAccount = useCallback(async (accountId: string) => {
    if (!userId) return;
    Alert.alert(
      "Delete Manual Account",
      "Are you sure you want to delete this account? All associated transaction history will be permanently removed. This action cannot be undone.",
      [
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
          invalidateAccountDetailCache(userId);
          await loadAccounts(false, true);
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
    Alert.alert(
      "Disconnect Account",
      `Are you sure you want to unlink ${pa.name}? This will stop future synchronization and remove it from your dashboard. It will not affect your data at the bank.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink", style: "destructive", onPress: async () => {
          try {
            await removePlaidItem(pa.plaid_item_id);
            invalidateAccountDetailCache(userId);
            router.back();
          } catch (e) {
            Alert.alert("Error", "Could not unlink account.");
          }
        }
      }
    ])
  }, [deleteAccount, router, combinedAccounts, currentSingleAccountId, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadAccounts(true, true);
    }, [loadAccounts, userId]),
  );

  const handleSingleEdit = useCallback(() => {
    const selected = combinedAccounts.find(a => a.id === currentSingleAccountId);
    if (!selected) return;
    router.push({
      pathname: "/account-edit",
      params: selected.kind === "manual"
        ? {
            kind: "manual",
            editId: String((selected.raw as AccountRow).id),
          }
        : {
            kind: "plaid",
            plaidAccountId: (selected.raw as PlaidAccount).account_id,
            initialPlaidAccount: JSON.stringify(selected.raw as PlaidAccount),
          },
    });
  }, [combinedAccounts, currentSingleAccountId, router]);

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


  const headerSearchBarOptions = useMemo(
    () => ({
      placeholder: "Search transactions...",
      onChangeText: (event: any) => setTxSearchQuery(event.nativeEvent.text),
      hideWhenScrolling: false,
      tintColor: ui.accent,
      textColor: ui.text,
      hintTextColor: ui.mutedText,
    }),
    [setTxSearchQuery, ui.accent, ui.mutedText, ui.text],
  );

  const handleSingleAccountChange = useCallback((newId: string) => {
    startTransition(() => {
      setCurrentSingleAccountId(newId);
    });
  }, []);

  if (authLoading && !session) return <AccountsLoadingState ui={ui} insets={insets} />;
  if (!session) return <AccountsSignedOutState ui={ui} insets={insets} />;

  return (
    <>
      <Stack.Screen
        options={{
          headerLargeTitle: false,
          headerTitle: "Account Details",
          headerTitleAlign: "center",
          headerBackButtonDisplayMode: "minimal",
          headerSearchBarOptions,
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerLargeStyle: { backgroundColor: Platform.OS === "ios" ? "transparent" : undefined },
          headerStyle: { backgroundColor: Platform.OS === "android" ? (isDark ? theme.colors.surface : theme.colors.surfaceVariant) : "transparent" },
          headerTitleStyle: { color: isDark ? "#ffffff" : "#111111" },
          headerLargeTitleStyle: { color: isDark ? "#ffffff" : "#111111" },
          headerTintColor: ui.accent,
        }}
      />
      <ScrollView
        style={[styles.screen, { backgroundColor: ui.bg }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 24,
            paddingTop: 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              invalidateAccountDetailCache(userId);
              loadAccounts(false, true);
              loadTransactions(true);
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
          onSingleAccountChange={handleSingleAccountChange}
          onOpenAddSource={() => router.push("/add-account-source")}
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

    </>
  );
}
