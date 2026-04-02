import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  InteractionManager,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  UIManager,
  View,
} from "react-native";
import type { LinkExit, LinkSuccess } from "react-native-plaid-link-sdk";
import {
  create as plaidCreate,
  destroy as plaidDestroy,
  open as plaidOpen,
} from "react-native-plaid-link-sdk";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Stack, useFocusEffect } from "expo-router";

import { AccountDetailModal } from "@/components/AccountDetailModal";
import type { UnifiedAccount } from "@/components/accounts/AccountCardCarousel";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { useTabTransition } from "@/components/ui/useTabTransition";
import { tabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  createAccount as createAccountApi,
  deleteAccount as deleteAccountApi,
  updateAccount as updateAccountApi,
} from "@/utils/accounts";
import { listExpenses } from "@/utils/expenses";
import { listGoals } from "@/utils/goals";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import {
  exchangePublicToken,
  getLinkToken,
  getPlaidAccounts,
  getPlaidTransactions,
  removePlaidItem,
} from "@/utils/plaid";
import { supabase } from "@/utils/supabase";

import { AccountsAddSourceModal } from "./components/AccountsAddSourceModal";
import { AccountsAllView } from "./components/AccountsAllView";
import { AccountsBackButton } from "./components/AccountsBackButton";
import { AccountsCreateModal } from "./components/AccountsCreateModal";
import { AccountsEditModal } from "./components/AccountsEditModal";
import { AccountsFab } from "./components/AccountsFab";
import { AccountsSingleView } from "./components/AccountsSingleView";
import {
  AccountsLoadingState,
  AccountsSignedOutState,
} from "./components/AccountsState";
import { styles } from "./styles";
import type { AccountRow, AccountType, ExpenseRow, GoalRow } from "./types";

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();

  const insets = useSafeAreaInsets();

  // Dynamic tab bar height (NativeTabs-safe)
  const tabBarHeight = insets.bottom + 60;
  const fabBottom = tabBarHeight - 16;
  const ui = tabsTheme.ui;
  const transition = useTabTransition();

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

  // create form
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("credit");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createBalance, setCreateBalance] = useState("");
  const [createLimit, setCreateLimit] = useState("");
  const [createInterest, setCreateInterest] = useState("");
  const [createStatementDate, setCreateStatementDate] = useState("");
  const [createPaymentDate, setCreatePaymentDate] = useState("");
  const [createCurrency, setCreateCurrency] = useState("CAD");

  // edit state
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editInterest, setEditInterest] = useState("");
  const [editStatementDate, setEditStatementDate] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "single">("all");
  const [singleAccountId, setSingleAccountId] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<
    PlaidTransaction[]
  >([]);
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<
    ExpenseRow | PlaidTransaction | null
  >(null);
  const [isTxDetailVisible, setIsTxDetailVisible] = useState(false);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Palette helper keeps credit/debit cards visually grouped.
  const getAccountColor = useCallback(
    (item: AccountRow | PlaidAccount, index: number) => {
      const type = (
        ("account_type" in item ? item.account_type : item.type) ?? ""
      ).toLowerCase();
      const isDebit =
        type === "debit" ||
        type === "depository" ||
        type === "checking" ||
        type === "savings";
      const palette = isDebit
        ? ["#701D26", "#8A2431", "#5A1520", "#9B2B3A"] // DEBIT_PALETTE
        : ["#D86666", "#E07A7A", "#C95454", "#E39191"]; // CREDIT_PALETTE
      return palette[index % palette.length];
    },
    [],
  );

  const headerSearchBarOptions = useMemo(
    () => ({
      placeholder: "Search accounts...",
      onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
      hideWhenScrolling: false,
      tintColor: ui.accent,
      textColor: ui.text,
      hintTextColor: ui.mutedText,
      headerIconColor: ui.mutedText,
      placement: "integratedButton" as const,
    }),
    [setSearchQuery, ui.accent, ui.mutedText, ui.text],
  );
  const [selectedDetailAccount, setSelectedDetailAccount] = useState<
    AccountRow | PlaidAccount | null
  >(null);

  // Plaid Link state
  const [isConnecting, setIsConnecting] = useState(false);
  const canCreate = useMemo(
    () => !!userId && name.trim().length > 0,
    [userId, name],
  );

  // Primary loader for manual accounts, goals, and Plaid summaries.
  const loadAccounts = useCallback(
    async (silent = false) => {
      if (!userId) {
        setAccounts([]);
        return;
      }

      // Improved loading UX: only show spinner if we have no data at all
      const hasData =
        accounts.length > 0 || goals.length > 0 || plaidAccounts.length > 0;
      if (!silent && !hasData) setIsLoading(true);

      try {
        const [accountsResponse, goalsData, pAccounts] = await Promise.all([
          supabase
            .from("account")
            .select(
              "id, profile_id, created_at, account_name, account_type, balance, credit_limit, statement_duedate, payment_duedate, interest_rate, currency",
            )
            .eq("profile_id", userId)
            .order("created_at", { ascending: false }),
          listGoals({ profile_id: userId }),
          getPlaidAccounts(),
        ]);

        if (accountsResponse.error) throw accountsResponse.error;

        setAccounts((accountsResponse.data as AccountRow[]) ?? []);
        setGoals(
          (goalsData as any[])?.map((g) => ({
            id: g.id,
            name: g.name,
            target_amount: g.target_amount,
            current_amount: g.current_amount,
            target_date: g.target_date,
            linked_account: g.linked_account,
            linked_plaid_account: g.linked_plaid_account,
          })) ?? [],
        );
        setPlaidAccounts(pAccounts ?? []);
      } catch (err) {
        console.error("Error loading accounts data:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, accounts.length, goals.length, plaidAccounts.length],
  );

  // Transaction loader used by the single-account view.
  const loadTransactions = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      setPlaidTransactions([]);
      return;
    }
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

  // Plaid: connect bank handler (must be after loadAccounts)
  const handleConnectBank = useCallback(
    async (options?: { onBeforeOpen?: () => void; onError?: () => void }) => {
      try {
        setIsConnecting(true);
        const token = await getLinkToken();

        // Android requires destroy() before create() to clear stale sessions
        await plaidDestroy();

        // create() initializes the SDK; open() must wait for onLoad
        plaidCreate({
          token,
          noLoadingState: false,
          onLoad: () => {
            options?.onBeforeOpen?.();
            plaidOpen({
              onSuccess: async (success: LinkSuccess) => {
                try {
                  setIsConnecting(true);
                  const institutionName = success.metadata?.institution?.name;
                  await exchangePublicToken(
                    success.publicToken,
                    institutionName,
                  );
                  Alert.alert(
                    "Success!",
                    `${institutionName || "Bank"} connected successfully.`,
                  );
                  await loadAccounts();
                  getPlaidAccounts()
                    .then(setPlaidAccounts)
                    .catch(console.error);
                } catch (err) {
                  console.error("Error exchanging token:", err);
                  Alert.alert(
                    "Connection Error",
                    "Bank connection failed. Please try again.",
                  );
                } finally {
                  setIsConnecting(false);
                }
              },
              onExit: (exit: LinkExit) => {
                console.log("Plaid Link exited:", exit);
                setIsConnecting(false);
              },
            });
          },
        });
      } catch (err) {
        console.error("Error getting link token:", err);
        Alert.alert(
          "Connection Error",
          "Could not start bank connection. Please try again.",
        );
        setIsConnecting(false);
        options?.onError?.();
      }
    },
    [loadAccounts],
  );

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        loadAccounts(true);
      });
      return () => task.cancel();
    }, [loadAccounts]),
  );

  useEffect(() => {
    if (viewMode === "single") {
      loadTransactions();
    }
  }, [viewMode, loadTransactions]);

  const toggleViewMode = useCallback((nextMode: "all" | "single") => {
    LayoutAnimation.configureNext({
      duration: 220,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setViewMode(nextMode);
  }, []);

  // Sync edit state when editingAccount changes
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

  const createAccount = useCallback(async () => {
    if (!userId) return;
    if (!canCreate) return;

    setIsLoading(true);

    const cleanNumber = (value: string, fallback?: number) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return fallback ?? 0;
      const parsed = parseFloat(trimmed);
      return Number.isFinite(parsed) ? parsed : (fallback ?? 0);
    };

    const cleanText = (value: string, fallback?: string) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : (fallback ?? "");
    };

    // payload for fields upon creating account
    const payload = {
      profile_id: userId,
      account_name: name.trim(),
      account_type: type,
      // default values, can be edited later
      balance: cleanNumber(createBalance, 0),
      credit_limit: cleanNumber(createLimit, 0),
      statement_duedate: cleanText(createStatementDate, "2026-01-01"),
      payment_duedate: cleanText(createPaymentDate, "2026-01-01"),
      interest_rate: cleanNumber(createInterest, 0),
      currency: cleanText(createCurrency, "CAD"),
    };

    try {
      await createAccountApi(payload);
    } catch (error) {
      console.error("Error adding account:", error);
      Alert.alert("Could not add account", "Please try again.");
      setIsLoading(false);
      return;
    }

    setName("");
    setType("credit");
    setCreateBalance("");
    setCreateLimit("");
    setCreateInterest("");
    setCreateStatementDate("");
    setCreatePaymentDate("");
    setCreateCurrency("CAD");
    setCreateModalOpen(false);
    await loadAccounts();
    setIsLoading(false);
  }, [
    userId,
    canCreate,
    name,
    type,
    createBalance,
    createLimit,
    createInterest,
    createStatementDate,
    createPaymentDate,
    createCurrency,
    loadAccounts,
  ]);

  const updateAccount = useCallback(async () => {
    if (!userId || !editingAccount) return;

    setIsLoading(true);

    // clean the inputted data when editing
    const cleanText = (value: string, fallback?: string | null) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
      return fallback ?? undefined;
    };

    const cleanNumber = (value: string, fallback?: number | null) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return fallback ?? 0;
      const parsed = parseFloat(trimmed);
      return Number.isFinite(parsed) ? parsed : (fallback ?? 0);
    };

    // new payload
    const payload = {
      account_name: cleanText(editName, editingAccount.account_name),
      balance: cleanNumber(editBalance, editingAccount.balance),
      credit_limit: cleanNumber(editLimit, editingAccount.credit_limit),
      interest_rate: cleanNumber(editInterest, editingAccount.interest_rate),
      statement_duedate: cleanText(
        editStatementDate,
        editingAccount.statement_duedate,
      ),
      payment_duedate: cleanText(
        editPaymentDate,
        editingAccount.payment_duedate,
      ),
      currency: cleanText(editCurrency, editingAccount.currency),
    };

    try {
      await updateAccountApi({
        id: editingAccount.id,
        profile_id: userId,
        update: payload,
      });
    } catch (error) {
      console.error("Error updating account:", error);
      Alert.alert("Could not update account", "Please try again.");
      setIsLoading(false);
      return;
    }

    setEditingAccount(null);
    setDetailModalVisible(false);
    setSelectedDetailAccount(null);
    await loadAccounts();
    setIsLoading(false);
  }, [
    userId,
    editingAccount,
    editName,
    editBalance,
    editLimit,
    editInterest,
    editStatementDate,
    editPaymentDate,
    editCurrency,
    loadAccounts,
  ]);

  // delete account
  const deleteAccount = useCallback(
    async (accountId: string) => {
      if (!userId) return;

      Alert.alert(
        "Delete account?",
        "This will delete all transactions associated with the account.\n\nThis action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setIsLoading(true);

              try {
                await deleteAccountApi({ id: accountId, profile_id: userId });
              } catch (error) {
                console.error("Error deleting account:", error);
                Alert.alert("Could not delete account", "Please try again.");
                setIsLoading(false);
                return;
              }

              await loadAccounts();
              setEditingAccount(null); // Close the edit modal
              setDetailModalVisible(false); // Close the detail modal
              setSelectedDetailAccount(null);
              setIsLoading(false);
            },
          },
        ],
      );
    },
    [userId, loadAccounts],
  );

  const calculateAvailable = useCallback(
    (account: AccountRow) => {
      const totalBalance = account.balance ?? 0;
      const accountGoals = goals.filter(
        (g) => g.linked_account === Number(account.id),
      );
      const allocated = accountGoals.reduce(
        (sum, g) => sum + (g.current_amount ?? 0),
        0,
      );
      return totalBalance - allocated;
    },
    [goals],
  );

  const calculatePlaidAvailable = useCallback(
    (pa: PlaidAccount) => {
      const totalBalance = pa.balances.current ?? 0;
      const accountGoals = goals.filter(
        (g) => g.linked_plaid_account === pa.account_id,
      );
      const allocated = accountGoals.reduce(
        (sum, g) => sum + (g.current_amount ?? 0),
        0,
      );
      return totalBalance - allocated;
    },
    [goals],
  );

  const formatMoney = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  }, []);

  const filteredManualAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return accounts;

    return accounts.filter((account) => {
      const namePart = account.account_name?.toLowerCase() ?? "";
      const typePart = account.account_type?.toLowerCase() ?? "";
      const currencyPart = account.currency?.toLowerCase() ?? "";
      return (
        namePart.includes(q) || typePart.includes(q) || currencyPart.includes(q)
      );
    });
  }, [accounts, searchQuery]);

  const filteredPlaidAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return plaidAccounts;

    return plaidAccounts.filter((pa) => {
      const namePart = pa.name?.toLowerCase() ?? "";
      const typePart = pa.type?.toLowerCase() ?? "";
      const subtypePart = pa.subtype?.toLowerCase() ?? "";
      return (
        namePart.includes(q) || typePart.includes(q) || subtypePart.includes(q)
      );
    });
  }, [plaidAccounts, searchQuery]);

  // Normalized list used to drive carousel and single-account selection.
  const combinedAccounts = useMemo(() => {
    const manual = accounts.map((acc) => ({
      id: `manual:${acc.id}`,
      kind: "manual" as const,
      raw: acc,
      label: acc.account_name ?? "Account",
    }));
    const plaid = plaidAccounts.map((pa) => ({
      id: `plaid:${pa.account_id}`,
      kind: "plaid" as const,
      raw: pa,
      label: pa.name,
    }));
    return [...manual, ...plaid];
  }, [accounts, plaidAccounts]);

  // UI-ready view model for the account carousel.
  const unifiedAccounts: UnifiedAccount[] = useMemo(() => {
    return combinedAccounts.map((item, index) => {
      if (item.kind === "manual") {
        const acc = item.raw as AccountRow;
        const typeValue = acc.account_type ?? "Account";
        const typeLabel =
          typeValue.charAt(0).toUpperCase() + typeValue.slice(1);
        const available = calculateAvailable(acc);

        return {
          key: item.id,
          kind: "manual",
          color: getAccountColor(acc, index),
          name: acc.account_name ?? "Unnamed Account",
          balance: formatMoney(acc.balance ?? 0),
          availableBalance: formatMoney(available),
          typeLabel,
          subtitle: acc.currency ?? "CAD",
          sourceLabel: "Manual",
          data: acc,
        };
      }

      const pa = item.raw as PlaidAccount;
      const typeValue = pa.type ?? "Account";
      const typeLabel = typeValue.charAt(0).toUpperCase() + typeValue.slice(1);
      const subtitle = pa.subtype
        ? pa.subtype.charAt(0).toUpperCase() + pa.subtype.slice(1)
        : "Bank";
      const available = calculatePlaidAvailable(pa);

      return {
        key: item.id,
        kind: "plaid",
        color: getAccountColor(pa, index),
        name: pa.name,
        balance: formatMoney(pa.balances.current ?? 0),
        availableBalance: formatMoney(pa.balances.available ?? available),
        typeLabel,
        subtitle,
        sourceLabel: "Plaid",
        institutionName: pa.institution_name,
        mask: pa.mask,
        data: pa,
      };
    });
  }, [
    combinedAccounts,
    calculateAvailable,
    calculatePlaidAvailable,
    formatMoney,
    getAccountColor,
  ]);

  useEffect(() => {
    if (!singleAccountId && combinedAccounts.length > 0) {
      setSingleAccountId(combinedAccounts[0].id);
    }
  }, [combinedAccounts, singleAccountId]);

  const activeCardIndex = useMemo(() => {
    if (!combinedAccounts.length) return 0;
    if (!singleAccountId) return 0;
    const idx = combinedAccounts.findIndex(
      (account) => account.id === singleAccountId,
    );
    return idx >= 0 ? idx : 0;
  }, [combinedAccounts, singleAccountId]);

  const selectedAccount = useMemo(() => {
    if (!singleAccountId) return combinedAccounts[0] ?? null;
    return (
      combinedAccounts.find((acc) => acc.id === singleAccountId) ??
      combinedAccounts[0] ??
      null
    );
  }, [combinedAccounts, singleAccountId]);

  const selectedFilterId = useMemo(() => {
    if (!selectedAccount) return null;
    if (selectedAccount.kind === "manual") {
      const manual = selectedAccount.raw as AccountRow;
      const numericId = Number(manual.id);
      return Number.isFinite(numericId) ? numericId : null;
    }
    const plaid = selectedAccount.raw as PlaidAccount;
    return `plaid:${plaid.account_id}`;
  }, [selectedAccount]);

  const openSingleAccount = useCallback(
    (id: string) => {
      setSingleAccountId(id);
      toggleViewMode("single");
    },
    [toggleViewMode],
  );

  // Single-view action handlers keep JSX lean and easier to scan.
  const handleSingleDelete = useCallback(() => {
    if (!selectedAccount) return;
    if (selectedAccount.kind === "manual") {
      deleteAccount((selectedAccount.raw as AccountRow).id);
      return;
    }

    const pa = selectedAccount.raw as PlaidAccount;
    Alert.alert(
      "Unlink Account?",
      "Are you sure you want to unlink this account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            try {
              await removePlaidItem(pa.plaid_item_id);
              await loadAccounts();
              await loadTransactions();
            } catch (err) {
              console.error("Error unlinking:", err);
              Alert.alert("Error", "Could not unlink account.");
            }
          },
        },
      ],
    );
  }, [deleteAccount, loadAccounts, loadTransactions, selectedAccount]);

  const handleSingleEdit = useCallback(() => {
    if (!selectedAccount) return;
    setSelectedDetailAccount(selectedAccount.raw as AccountRow | PlaidAccount);
    setDetailModalVisible(true);
  }, [selectedAccount]);

  const accountsForTx = useMemo(() => {
    return accounts
      .map((acc) => {
        const numericId = Number(acc.id);
        if (!Number.isFinite(numericId)) return null;
        return {
          id: numericId,
          account_name: acc.account_name,
          account_type: acc.account_type,
          balance: acc.balance,
          currency: acc.currency,
        };
      })
      .filter(Boolean) as {
      id: number;
      account_name: string | null;
      account_type: string | null;
      balance: number | null;
      currency: string | null;
    }[];
  }, [accounts]);

  const filteredExpensesForSingle = useMemo(() => {
    if (selectedFilterId == null) return expenses;
    if (typeof selectedFilterId === "number") {
      return expenses.filter(
        (exp) => Number(exp.account_id) === selectedFilterId,
      );
    }
    return [];
  }, [expenses, selectedFilterId]);

  const filteredPlaidForSingle = useMemo(() => {
    if (selectedFilterId == null) return plaidTransactions;
    if (
      typeof selectedFilterId === "string" &&
      selectedFilterId.startsWith("plaid:")
    ) {
      const plaidId = selectedFilterId.replace("plaid:", "");
      return plaidTransactions.filter((tx) => tx.account_id === plaidId);
    }
    return [];
  }, [plaidTransactions, selectedFilterId]);

  useEffect(() => {
    if (viewMode === "single") {
      setTxSearchQuery("");
    }
  }, [viewMode, selectedFilterId]);

  if (authLoading && !session) {
    return <AccountsLoadingState ui={ui} insets={insets} />;
  }

  if (!session) {
    return <AccountsSignedOutState ui={ui} insets={insets} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerSearchBarOptions }} />
      <View style={[styles.screen, { backgroundColor: ui.bg }]}>
        <Animated.View
          style={[styles.contentWrap, transition.style]}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
            <ScrollView
              style={styles.container}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingBottom: tabBarHeight + 120,
                  paddingTop: Platform.OS === "android" ? 16 : 0,
                },
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={() => {
                    loadAccounts();
                    if (viewMode === "single") {
                      loadTransactions();
                    }
                  }}
                  tintColor={ui.text}
                />
              }
            >
              {viewMode === "single" ? (
                <AccountsSingleView
                  ui={ui}
                  isLoading={isLoading}
                  combinedAccounts={combinedAccounts}
                  unifiedAccounts={unifiedAccounts}
                  activeCardIndex={activeCardIndex}
                  singleAccountId={singleAccountId}
                  txSearchQuery={txSearchQuery}
                  filteredExpenses={filteredExpensesForSingle}
                  filteredPlaidTransactions={filteredPlaidForSingle}
                  accountsForTx={accountsForTx}
                  plaidAccounts={plaidAccounts}
                  onSingleAccountChange={(id) => setSingleAccountId(id)}
                  onOpenAddSource={() => setAddSourceModalOpen(true)}
                  onDeleteSelected={handleSingleDelete}
                  onEditSelected={handleSingleEdit}
                  onTxSearchChange={setTxSearchQuery}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxDetailVisible(true);
                  }}
                />
              ) : (
                <AccountsAllView
                  ui={ui}
                  isLoading={isLoading}
                  filteredManualAccounts={filteredManualAccounts}
                  filteredPlaidAccounts={filteredPlaidAccounts}
                  manualCount={accounts.length}
                  formatMoney={formatMoney}
                  getAccountColor={getAccountColor}
                  onOpenAddSource={() => setAddSourceModalOpen(true)}
                  onOpenSingleAccount={openSingleAccount}
                />
              )}
            </ScrollView>
            {viewMode === "single" && (
              <AccountsBackButton
                ui={ui}
                tabBarHeight={tabBarHeight}
                onPress={() => toggleViewMode("all")}
              />
            )}
          </Animated.View>

          <AccountsFab
            ui={ui}
            fabBottom={fabBottom}
            onPress={() => setAddSourceModalOpen(true)}
          />

          {/* Select Source Modal */}
          <AccountsAddSourceModal
            visible={addSourceModalOpen}
            ui={ui}
            isConnecting={isConnecting}
            onClose={() => setAddSourceModalOpen(false)}
            onCreateManual={() => {
              setAddSourceModalOpen(false);
              setCreateModalOpen(true);
            }}
            onConnectBank={() => {
              handleConnectBank({
                onBeforeOpen: () => setAddSourceModalOpen(false),
                onError: () => setAddSourceModalOpen(false),
              });
            }}
          />

          <AccountsCreateModal
            visible={createModalOpen}
            ui={ui}
            insets={insets}
            name={name}
            type={type}
            typeModalOpen={typeModalOpen}
            createBalance={createBalance}
            createLimit={createLimit}
            createInterest={createInterest}
            createStatementDate={createStatementDate}
            createPaymentDate={createPaymentDate}
            createCurrency={createCurrency}
            canCreate={canCreate}
            isLoading={isLoading}
            onClose={() => setCreateModalOpen(false)}
            onSubmit={createAccount}
            onNameChange={setName}
            onTypeChange={setType}
            onTypeModalChange={setTypeModalOpen}
            onBalanceChange={setCreateBalance}
            onLimitChange={setCreateLimit}
            onInterestChange={setCreateInterest}
            onStatementDateChange={setCreateStatementDate}
            onPaymentDateChange={setCreatePaymentDate}
            onCurrencyChange={setCreateCurrency}
          />

          <TransactionDetailModal
            visible={isTxDetailVisible}
            onClose={() => {
              setIsTxDetailVisible(false);
              setSelectedTransaction(null);
            }}
            transaction={selectedTransaction}
            accounts={accountsForTx}
          />

          {/* Account Detail Modal with nested Edit Account Modal */}
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
                  ? calculatePlaidAvailable(
                      selectedDetailAccount as PlaidAccount,
                    )
                  : calculateAvailable(selectedDetailAccount as AccountRow)
                : null
            }
            onEdit={(acc: any) => {
              setEditingAccount(acc as AccountRow);
            }}
            onUnlink={(pa: any) => {
              Alert.alert(
                "Unlink Account?",
                "Are you sure you want to unlink this account? Your data will be removed.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Unlink",
                    style: "destructive",
                    onPress: async () => {
                      setDetailModalVisible(false);
                      try {
                        if (!pa.plaid_item_id) {
                          Alert.alert("Error", "No item ID found.");
                          return;
                        }
                        await removePlaidItem(pa.plaid_item_id);
                        await loadAccounts();
                        getPlaidAccounts()
                          .then(setPlaidAccounts)
                          .catch(console.error);
                      } catch (e) {
                        console.error("Error unlinking:", e);
                        Alert.alert("Error", "Could not unlink account.");
                      }
                    },
                  },
                ],
              );
            }}
          >
            {/* Edit Account Modal (Nested) */}
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
              onDelete={() =>
                editingAccount && deleteAccount(editingAccount.id)
              }
              onNameChange={setEditName}
              onBalanceChange={setEditBalance}
              onLimitChange={setEditLimit}
              onInterestChange={setEditInterest}
              onStatementDateChange={setEditStatementDate}
              onPaymentDateChange={setEditPaymentDate}
              onCurrencyChange={setEditCurrency}
            />
          </AccountDetailModal>
        </View>
    </>
  );
}
