import Feather from "@expo/vector-icons/Feather";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  InteractionManager,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import type { LinkExit, LinkSuccess } from "react-native-plaid-link-sdk";
import {
  create as plaidCreate,
  destroy as plaidDestroy,
  open as plaidOpen,
} from "react-native-plaid-link-sdk";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFocusEffect, useNavigation, useRouter } from "expo-router";

import { AccountDetailModal } from "@/components/AccountDetailModal";
import {
  AccountHeroCard,
  AccountWaveCard,
} from "@/components/accounts/AccountCards";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { TransactionsList } from "@/components/transactions/TransactionsList";
import { AppHeader } from "@/components/ui/AppHeader";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useTabSwipe } from "@/components/ui/useTabSwipe";
import { useTabTransition } from "@/components/ui/useTabTransition";
import { Tokens } from "@/constants/authTokens";
import { tabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  createAccount as createAccountApi,
  deleteAccount as deleteAccountApi,
  updateAccount as updateAccountApi,
} from "@/utils/accounts";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
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

type AccountType = "credit" | "debit";

// fields in the accounts table
type AccountRow = {
  id: string;
  profile_id: string;
  created_at?: string | null;

  account_type: string | null;
  account_name: string | null;

  balance: number | null;
  credit_limit: number | null;

  statement_duedate: string | null;
  payment_duedate: string | null;

  interest_rate: number | null;
  currency: string | null;
};

type GoalRow = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number | null;
  target_date: string | null;
  linked_account: number | null;
  linked_plaid_account: string | null;
};

type ExpenseRow = {
  id: string;
  amount: number | null;
  description?: string | null;
  created_at?: string | null;
  account_id?: number | null;
  expense_categoryid?: number | null;
  subcategory_id?: number | null;
  transaction_date?: string | null;
  recurring_rule_id?: number | null;
};

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();

  const router = useRouter();
  const navigation = useNavigation();

  const insets = useSafeAreaInsets();

  // Dynamic tab bar height
  let tabBarHeight = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    // Fallback if hook fails (e.g. not in tab navigator context)
    tabBarHeight = insets.bottom + 60;
  }
  const fabBottom = tabBarHeight - 16;
  const ui = tabsTheme.ui;
  const transition = useTabTransition();
  const swipe = useTabSwipe(1);

  const userId = session?.user.id;
  const handleProfilePress = useCallback(() => {
    router.push("/profile");
  }, [router]);

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

  const openAddTransaction = useCallback(() => {
    router.push({
      pathname: "/(tabs)/transactions",
      params: { openAdd: String(Date.now()) },
    });
  }, [router]);

  const getAccountColor = (item: AccountRow | PlaidAccount, index: number) => {
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
  };

  const screenWidth = Dimensions.get("window").width;
  const containerGutter = 16;
  const cardSideGap = 0;
  const cardGap = 12;
  const cardWidth = Math.max(280, screenWidth - containerGutter * 2);
  const cardSnap = cardWidth + cardGap;

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: "Search accounts...",
          onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
          hideWhenScrolling: true,
          tintColor: ui.accent,
          textColor: ui.text,
          hintTextColor: ui.mutedText,
          headerIconColor: ui.mutedText,
          shouldShowHintSearchIcon: false,
        },
      });
    }, [navigation, ui, router]),
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

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  const formatCardDate = (value?: string | null) => {
    if (!value) return "--/--/--";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const userTimezoneOffset = parsed.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(parsed.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString("en-CA", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  const totalBalance = useMemo(() => {
    const manualTotal = accounts.reduce((sum, account) => {
      const isLiability =
        (account.account_type ?? "").toLowerCase() === "credit";
      const bal = account.balance ?? 0;
      return isLiability ? sum - bal : sum + bal;
    }, 0);

    const plaidTotal = plaidAccounts.reduce((sum, pa) => {
      const type = (pa.type ?? "").toLowerCase();
      const isLiability = type === "credit" || type === "loan";
      const bal = pa.balances.current ?? 0;
      return isLiability ? sum - bal : sum + bal;
    }, 0);

    return manualTotal + plaidTotal;
  }, [accounts, plaidAccounts]);

  const totalAvailable = useMemo(() => {
    const manualAvail = accounts.reduce(
      (sum, account) => sum + calculateAvailable(account),
      0,
    );
    const plaidAvail = plaidAccounts.reduce((sum, pa) => {
      const type = (pa.type ?? "").toLowerCase();
      const isLiability = type === "credit" || type === "loan";
      const avail = calculatePlaidAvailable(pa);
      return isLiability ? sum - avail : sum + avail;
    }, 0);
    return manualAvail + plaidAvail;
  }, [accounts, plaidAccounts, calculateAvailable, calculatePlaidAvailable]);

  const assetsCount = useMemo(() => {
    const manualAssets = accounts.filter(
      (a) => (a.account_type ?? "").toLowerCase() !== "credit",
    ).length;
    const plaidAssets = plaidAccounts.filter((pa) => {
      const type = (pa.type ?? "").toLowerCase();
      return type !== "credit" && type !== "loan";
    }).length;
    return manualAssets + plaidAssets;
  }, [accounts, plaidAccounts]);

  const liabilitiesCount = useMemo(() => {
    const manualLiabilities = accounts.filter(
      (a) => (a.account_type ?? "").toLowerCase() === "credit",
    ).length;
    const plaidLiabilities = plaidAccounts.filter((pa) => {
      const type = (pa.type ?? "").toLowerCase();
      return type === "credit" || type === "loan";
    }).length;
    return manualLiabilities + plaidLiabilities;
  }, [accounts, plaidAccounts]);

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

  useEffect(() => {
    if (!singleAccountId && combinedAccounts.length > 0) {
      setSingleAccountId(combinedAccounts[0].id);
    }
  }, [combinedAccounts, singleAccountId]);

  const selectedAccount = useMemo(() => {
    if (!singleAccountId) return combinedAccounts[0] ?? null;
    return (
      combinedAccounts.find((acc) => acc.id === singleAccountId) ??
      combinedAccounts[0] ??
      null
    );
  }, [combinedAccounts, singleAccountId]);

  const handleCardSnap = useCallback(
    (offsetX: number) => {
      if (!combinedAccounts.length) return;
      const index = Math.round(offsetX / cardSnap);
      const next =
        combinedAccounts[
          Math.min(Math.max(index, 0), combinedAccounts.length - 1)
        ];
      if (next && next.id !== singleAccountId) {
        setSingleAccountId(next.id);
      }
    },
    [combinedAccounts, cardSnap, singleAccountId],
  );

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
    return (
      <View style={[styles.screen, { backgroundColor: ui.bg }]}>
        <AppHeader title="Accounts" onRightPress={handleProfilePress} />
        <View style={[styles.stateWrap, { paddingTop: 12 }]}>
          <ThemedText style={{ color: ui.text }}>Loading…</ThemedText>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.screen, { backgroundColor: ui.bg }]}>
        <AppHeader title="Accounts" onRightPress={handleProfilePress} />
        <View style={[styles.stateWrap, { paddingTop: 12 }]}>
          <ThemedText type="title" style={{ color: ui.text }}>
            Accounts
          </ThemedText>
          <ThemedText style={{ color: ui.mutedText }}>
            Please sign in to view accounts.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <PanGestureHandler
      onGestureEvent={swipe.onGestureEvent}
      onHandlerStateChange={swipe.onHandlerStateChange}
      activeOffsetX={[-20, 20]}
      failOffsetY={[-15, 15]}
    >
      <View style={[styles.screen, { backgroundColor: ui.bg }]}>
        <AppHeader title="Accounts" onRightPress={handleProfilePress} />
        <Animated.View
          style={[styles.contentWrap, transition.style, swipe.style]}
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
              <View style={styles.singleViewWrap}>
                {combinedAccounts.length === 0 ? (
                  <View
                    style={[
                      styles.emptyState,
                      { borderColor: ui.border, backgroundColor: ui.surface2 },
                    ]}
                  >
                    <ThemedText style={{ color: ui.text }}>
                      {isLoading ? "Loading..." : "No accounts yet."}
                    </ThemedText>
                  </View>
                ) : (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      snapToInterval={cardSnap}
                      snapToAlignment="start"
                      decelerationRate="fast"
                      contentContainerStyle={{
                        paddingHorizontal: cardSideGap,
                        gap: cardGap,
                      }}
                      style={styles.singleCarousel}
                      onMomentumScrollEnd={(event) => {
                        handleCardSnap(event.nativeEvent.contentOffset.x);
                      }}
                    >
                      {combinedAccounts.map((item, idx) => {
                        const raw = item.raw as AccountRow | PlaidAccount;
                        const isSelected = selectedAccount?.id === item.id;
                        const accountName =
                          "account_name" in raw
                            ? (raw.account_name ?? "Account")
                            : raw.name;
                        const balance =
                          "balance" in raw
                            ? (raw.balance ?? 0)
                            : (raw.balances.current ?? 0);
                        const typeValue =
                          ("account_type" in raw
                            ? raw.account_type
                            : raw.type) ?? "Account";
                        const typeLabel =
                          typeValue.charAt(0).toUpperCase() +
                          typeValue.slice(1);
                        const creditLimit =
                          "credit_limit" in raw
                            ? raw.credit_limit
                            : raw.balances.limit;
                        const paymentDue =
                          "payment_duedate" in raw ? raw.payment_duedate : null;
                        const metaRows = [
                          {
                            label: "Credit Limit",
                            value:
                              creditLimit != null
                                ? formatMoney(creditLimit)
                                : "--",
                          },
                          {
                            label: "Payment due",
                            value: paymentDue
                              ? formatCardDate(paymentDue)
                              : "--/--/--",
                          },
                          {
                            label: typeLabel,
                            value:
                              "subtype" in raw && raw.subtype
                                ? raw.subtype
                                : "Account",
                          },
                        ];

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.singleCardWrap,
                              { width: cardWidth },
                            ]}
                          >
                            <AccountHeroCard
                              title={accountName}
                              balance={formatMoney(balance)}
                              color={getAccountColor(raw, idx)}
                              metaRows={metaRows}
                              isSelected={isSelected}
                              onPress={() => setSingleAccountId(item.id)}
                            />
                          </View>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.cardActions}>
                      <Pressable
                        style={[
                          styles.actionCircle,
                          {
                            backgroundColor: ui.surface,
                            borderColor: ui.border,
                          },
                        ]}
                        onPress={() => {
                          if (!selectedAccount) return;
                          if (selectedAccount.kind === "manual") {
                            deleteAccount(
                              (selectedAccount.raw as AccountRow).id,
                            );
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
                                    Alert.alert(
                                      "Error",
                                      "Could not unlink account.",
                                    );
                                  }
                                },
                              },
                            ],
                          );
                        }}
                      >
                        <Feather name="trash-2" size={16} color={ui.danger} />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.actionCircle,
                          {
                            backgroundColor: ui.surface,
                            borderColor: ui.border,
                          },
                        ]}
                        onPress={() => setAddSourceModalOpen(true)}
                      >
                        <Feather name="plus" size={18} color={ui.text} />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.actionCircle,
                          {
                            backgroundColor: ui.surface,
                            borderColor: ui.border,
                          },
                        ]}
                        onPress={() => {
                          if (!selectedAccount) return;
                          setSelectedDetailAccount(
                            selectedAccount.raw as AccountRow | PlaidAccount,
                          );
                          setDetailModalVisible(true);
                        }}
                      >
                        <Feather name="edit-2" size={16} color={ui.text} />
                      </Pressable>
                    </View>

                    <View style={styles.sectionHeader}>
                      <ThemedText
                        style={[styles.sectionTitle, { color: ui.text }]}
                      >
                        Transactions
                      </ThemedText>
                    </View>

                    <TransactionsList
                      ui={ui}
                      expenses={filteredExpensesForSingle}
                      plaidTransactions={filteredPlaidForSingle}
                      recurringRules={[]}
                      accounts={accountsForTx}
                      plaidAccounts={plaidAccounts}
                      filterAccountId={null}
                      onFilterAccountChange={() => {}}
                      searchQuery={txSearchQuery}
                      onSearchQueryChange={setTxSearchQuery}
                      onSelectTransaction={(tx) => {
                        setSelectedTransaction(tx);
                        setIsTxDetailVisible(true);
                      }}
                      isLoading={isLoading}
                      showFilters={false}
                      showMeta={false}
                      showBadges={false}
                    />
                  </>
                )}
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setAddSourceModalOpen(true)}
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

                <View style={styles.sectionHeader}>
                  <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
                    Self-Managed Accounts
                  </ThemedText>
                </View>

                {filteredManualAccounts.length === 0 ? (
                  <View
                    style={[
                      styles.emptyState,
                      { borderColor: ui.border, backgroundColor: ui.surface2 },
                    ]}
                  >
                    <ThemedText style={{ color: ui.text }}>
                      {isLoading ? "Loading..." : "No matches found."}
                    </ThemedText>
                  </View>
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
                        openSingleAccount(`manual:${item.id}`);
                      },
                    };

                    return <AccountWaveCard key={item.id} {...cardProps} />;
                  })
                )}

                {/* Linked Banks (Plaid) */}
                {filteredPlaidAccounts.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <View style={styles.sectionHeader}>
                      <ThemedText
                        style={[styles.sectionTitle, { color: ui.text }]}
                      >
                        Linked Banks
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.sectionSubtitle,
                          { color: ui.mutedText },
                        ]}
                      >
                        {filteredPlaidAccounts.length} account
                        {filteredPlaidAccounts.length !== 1 ? "s" : ""}
                      </ThemedText>
                    </View>

                    {filteredPlaidAccounts.map((pa, idx) => {
                      const cardProps = {
                        title: pa.name,
                        balance: formatMoney(pa.balances.current ?? 0),
                        typeLabel:
                          pa.type.charAt(0).toUpperCase() + pa.type.slice(1),
                        dateLabel: pa.subtype
                          ? pa.subtype.charAt(0).toUpperCase() +
                            pa.subtype.slice(1)
                          : "Bank",
                        color: getAccountColor(pa, idx + accounts.length),
                        onPress: () => {
                          openSingleAccount(`plaid:${pa.account_id}`);
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
            )}
          </ScrollView>
          {viewMode === "single" && (
            <Pressable
              onPress={() => toggleViewMode("all")}
              accessibilityRole="button"
              accessibilityLabel="Back to all accounts"
              style={({ pressed }) => [
                styles.backButton,
                styles.backButtonOverlay,
                {
                  borderColor: ui.border,
                  backgroundColor: pressed ? ui.surface2 : ui.surface,
                  opacity: pressed ? 0.85 : 1,
                  bottom: tabBarHeight + 8,
                },
              ]}
            >
              <Feather name="chevron-left" size={18} color={ui.text} />
            </Pressable>
          )}
        </Animated.View>

        <Pressable
          onPress={() => setAddSourceModalOpen(true)}
          style={({ pressed }) => [
            styles.fab,
            {
              width: 60,
              height: 60,
              borderRadius: 16,
              right: 16,
            },
            {
              backgroundColor: ui.text,
              opacity: pressed ? 0.8 : 1,
              bottom: fabBottom,
              elevation: 5,
            },
          ]}
        >
          <IconSymbol name="plus" size={24} color={ui.surface} />
        </Pressable>
        {/* Select Source Modal */}
        <SelectionModal
          visible={addSourceModalOpen}
          onClose={() => setAddSourceModalOpen(false)}
          title="Add Account"
          ui={ui}
        >
          <ThemedText
            style={{
              color: ui.mutedText,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            How would you like to add your new account?
          </ThemedText>

          <Pressable
            style={[
              styles.modalOption,
              {
                borderColor: ui.border,
                backgroundColor: ui.surface,
                flexDirection: "row",
                justifyContent: "flex-start",
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 12,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
            onPress={() => {
              setAddSourceModalOpen(false);
              setCreateModalOpen(true);
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: ui.surface2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="edit-2" size={18} color={ui.text} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold">
                Self-Managed Account
              </ThemedText>
              <ThemedText
                style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}
              >
                Enter transactions yourself
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.modalOption,
              {
                borderColor: ui.border,
                backgroundColor: ui.surface,
                flexDirection: "row",
                justifyContent: "flex-start",
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 12,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
            disabled={isConnecting}
            onPress={() => {
              handleConnectBank({
                onBeforeOpen: () => setAddSourceModalOpen(false),
                onError: () => setAddSourceModalOpen(false),
              });
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: ui.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color={ui.accent} />
              ) : (
                <Feather name="link" size={18} color={ui.accent} />
              )}
            </View>
            <View>
              <ThemedText type="defaultSemiBold">
                {isConnecting ? "Connecting..." : "Connect Bank"}
              </ThemedText>
              <ThemedText
                style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}
              >
                Sync automatically via Plaid
              </ThemedText>
            </View>
          </Pressable>
        </SelectionModal>

        <Modal
          visible={createModalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setCreateModalOpen(false)}
        >
          <ThemedView
            style={{
              flex: 1,
              backgroundColor: ui.surface,
              padding: 16,
              paddingTop: Platform.OS === "ios" ? 12 : 16 + insets.top,
              paddingBottom: 16 + insets.bottom,
            }}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft} />
              <ThemedText
                type="defaultSemiBold"
                style={styles.modalHeaderTitle}
              >
                Add Account
              </ThemedText>
              <View style={styles.modalHeaderRight}>
                <Pressable
                  onPress={() => setCreateModalOpen(false)}
                  hitSlop={20}
                  style={[
                    styles.modalCloseButton,
                    { backgroundColor: ui.surface2 },
                  ]}
                >
                  <Feather name="x" size={18} color={ui.text} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
              <ThemedText type="defaultSemiBold">Account name</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Account name (e.g. TD Credit)"
                placeholderTextColor={ui.mutedText}
                autoCapitalize="words"
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface2,
                    color: ui.text,
                  },
                ]}
              />

              <View
                style={[
                  styles.pickerContainer,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
              >
                <ThemedText type="defaultSemiBold">Account type</ThemedText>
                <Pressable
                  onPress={() => setTypeModalOpen(true)}
                  style={[
                    styles.dropdownButton,
                    { borderColor: ui.border, backgroundColor: ui.surface2 },
                  ]}
                >
                  <ThemedText>
                    {type === "credit" ? "Credit" : "Debit"}
                  </ThemedText>
                </Pressable>
              </View>

              <ThemedText type="defaultSemiBold">Balance</ThemedText>
              <TextInput
                value={createBalance}
                onChangeText={setCreateBalance}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface2,
                    color: ui.text,
                  },
                ]}
              />

              <ThemedText type="defaultSemiBold">Credit Limit</ThemedText>
              <TextInput
                value={createLimit}
                onChangeText={setCreateLimit}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface2,
                    color: ui.text,
                  },
                ]}
              />

              <ThemedText type="defaultSemiBold">Interest Rate (%)</ThemedText>
              <TextInput
                value={createInterest}
                onChangeText={setCreateInterest}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface2,
                    color: ui.text,
                  },
                ]}
              />

              <ThemedText type="defaultSemiBold">Currency</ThemedText>
              <TextInput
                value={createCurrency}
                onChangeText={setCreateCurrency}
                autoCapitalize="characters"
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface2,
                    color: ui.text,
                  },
                ]}
              />

              <DateTimePickerField
                label="Statement Due Date"
                value={parseLocalDate(createStatementDate)}
                onChange={(date) =>
                  setCreateStatementDate(toLocalISOString(date))
                }
                ui={ui}
              />

              <DateTimePickerField
                label="Payment Due Date"
                value={parseLocalDate(createPaymentDate)}
                onChange={(date) =>
                  setCreatePaymentDate(toLocalISOString(date))
                }
                ui={ui}
              />

              <Pressable
                onPress={createAccount}
                disabled={!canCreate || isLoading}
                style={[
                  styles.button,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.text,
                    width: "100%",
                    alignItems: "center",
                    borderRadius: 24,
                  },
                  (!canCreate || isLoading) && styles.buttonDisabled,
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: ui.surface }}
                >
                  Create
                </ThemedText>
              </Pressable>
            </ScrollView>

            {/* Account Type Selection Modal (Add) */}
            <SelectionModal
              visible={typeModalOpen}
              onClose={() => setTypeModalOpen(false)}
              title="Select Account Type"
              ui={ui}
            >
              <Pressable
                style={[
                  styles.modalOption,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
                onPress={() => {
                  setType("credit");
                  setTypeModalOpen(false);
                }}
              >
                <ThemedText>Credit</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalOption,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
                onPress={() => {
                  setType("debit");
                  setTypeModalOpen(false);
                }}
              >
                <ThemedText>Debit</ThemedText>
              </Pressable>
            </SelectionModal>
          </ThemedView>
        </Modal>

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
                ? calculatePlaidAvailable(selectedDetailAccount as PlaidAccount)
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
          <Modal
            visible={!!editingAccount}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setEditingAccount(null)}
          >
            <ThemedView
              style={{
                flex: 1,
                backgroundColor: ui.surface,
                padding: 16,
                paddingTop: Platform.OS === "ios" ? 12 : 16 + insets.top,
                paddingBottom: 16 + insets.bottom,
              }}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft} />
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.modalHeaderTitle}
                >
                  Edit Account
                </ThemedText>
                <View style={styles.modalHeaderRight}>
                  <Pressable
                    onPress={() => setEditingAccount(null)}
                    hitSlop={20}
                    style={[
                      styles.modalCloseButton,
                      { backgroundColor: ui.surface2 },
                    ]}
                  >
                    <Feather name="x" size={18} color={ui.text} />
                  </Pressable>
                </View>
              </View>

              <ScrollView
                contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
              >
                <View style={{ gap: 6 }}>
                  <ThemedText type="defaultSemiBold">Account Name</ThemedText>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface2,
                        color: ui.text,
                      },
                    ]}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <ThemedText type="defaultSemiBold">Balance</ThemedText>
                  <TextInput
                    value={editBalance}
                    onChangeText={setEditBalance}
                    keyboardType="numeric"
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface2,
                        color: ui.text,
                      },
                    ]}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <ThemedText type="defaultSemiBold">Credit Limit</ThemedText>
                  <TextInput
                    value={editLimit}
                    onChangeText={setEditLimit}
                    keyboardType="numeric"
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface2,
                        color: ui.text,
                      },
                    ]}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <ThemedText type="defaultSemiBold">
                    Interest Rate (%)
                  </ThemedText>
                  <TextInput
                    value={editInterest}
                    onChangeText={setEditInterest}
                    keyboardType="numeric"
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface2,
                        color: ui.text,
                      },
                    ]}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <ThemedText type="defaultSemiBold">Currency</ThemedText>
                  <TextInput
                    value={editCurrency}
                    onChangeText={setEditCurrency}
                    autoCapitalize="characters"
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface2,
                        color: ui.text,
                      },
                    ]}
                  />
                </View>

                {/* Native Date Pickers */}
                <DateTimePickerField
                  label="Statement Due Date"
                  value={parseLocalDate(editStatementDate)}
                  onChange={(date) =>
                    setEditStatementDate(toLocalISOString(date))
                  }
                  ui={ui}
                />

                <DateTimePickerField
                  label="Payment Due Date"
                  value={parseLocalDate(editPaymentDate)}
                  onChange={(date) =>
                    setEditPaymentDate(toLocalISOString(date))
                  }
                  ui={ui}
                />

                <Pressable
                  onPress={updateAccount}
                  style={[
                    styles.button,
                    {
                      backgroundColor: ui.text,
                      borderColor: ui.border,
                      alignSelf: "center",
                      width: "100%",
                      alignItems: "center",
                      marginTop: 16,
                      paddingVertical: 12,
                      borderRadius: 24,
                    },
                  ]}
                >
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: ui.surface }}
                  >
                    Save Changes
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() =>
                    editingAccount && deleteAccount(editingAccount.id)
                  }
                  disabled={isLoading}
                  style={[
                    styles.deleteAction,
                    {
                      borderColor: ui.border,
                      backgroundColor: ui.surface2,
                      borderRadius: 24,
                    },
                    isLoading && styles.buttonDisabled,
                  ]}
                >
                  <ThemedText style={{ color: ui.danger, fontWeight: "600" }}>
                    Delete Account
                  </ThemedText>
                </Pressable>
              </ScrollView>
            </ThemedView>
          </Modal>
        </AccountDetailModal>
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    position: "relative",
    overflow: "hidden",
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 12,
  },
  singleViewWrap: {
    gap: 12,
    position: "relative",
  },
  singleCarousel: {
    marginTop: 4,
  },
  singleCardWrap: {
    borderRadius: 22,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 0.2,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  heroCard: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 6,
    gap: 4,
  },
  heroLabel: {
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontSize: 12,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  heroValue: {
    fontFamily: "Lato-Bold",
    fontSize: 38,
    lineHeight: 40,
    textAlign: "center",
  },
  chartCard: {
    paddingTop: 2,
    paddingBottom: 2,
    gap: 6,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  yAxis: {
    width: 36,
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  yLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  chartArea: {
    flex: 1,
    height: 240,
    position: "relative",
    justifyContent: "center",
  },
  chartGuide: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  chartImage: {
    width: "100%",
    height: 214,
    alignSelf: "center",
  },
  monthRow: {
    marginTop: 6,
    paddingHorizontal: 42,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  monthLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  smallActionBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionText: {
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontSize: 13,
  },
  searchWrap: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15.5,
    paddingVertical: 0,
    fontFamily: Tokens.font.family,
  },
  searchFilter: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontSize: 16,
  },
  sectionSubtitle: {
    fontFamily: Tokens.font.family,
    fontSize: 12,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 2,
  },
  backButton: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  backButtonOverlay: {
    position: "absolute",
    left: 12,
    zIndex: 5,
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Tokens.font.family,
    fontSize: 15.5,
  },
  pickerContainer: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  dropdownButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    borderRadius: 24,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    width: "85%",
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalCancel: {
    opacity: 0.9,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonDisabled: { opacity: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fabCenter: {
    position: "absolute",
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteAction: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  modalHeaderTitle: {
    flex: 1,
    textAlign: "center",
  },
  modalHeaderLeft: {
    width: 44,
  },
  modalHeaderRight: {
    width: 44,
    alignItems: "flex-end",
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
