import Feather from "@expo/vector-icons/Feather";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme
} from "react-native";
import { Appbar, Searchbar, useTheme } from "react-native-paper";
import type { LinkExit, LinkSuccess } from "react-native-plaid-link-sdk";
import { create as plaidCreate, destroy as plaidDestroy, open as plaidOpen } from "react-native-plaid-link-sdk";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFocusEffect, useNavigation, useRouter } from "expo-router";

import { AccountDetailModal } from "@/components/AccountDetailModal";
import { AccountListCard, AccountWaveCard } from "@/components/accounts/AccountCards";
import { AccountsViewToggle } from "@/components/accounts/AccountsViewToggle";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Tokens } from "@/constants/authTokens";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  createAccount as createAccountApi,
  deleteAccount as deleteAccountApi,
  updateAccount as updateAccountApi,
} from "@/utils/accounts";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { listGoals } from "@/utils/goals";
import type { PlaidAccount } from "@/utils/plaid";
import { exchangePublicToken, getLinkToken, getPlaidAccounts, removePlaidItem } from "@/utils/plaid";
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

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();

  const router = useRouter();
  const navigation = useNavigation();

  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Dynamic tab bar height
  let tabBarHeight = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    // Fallback if hook fails (e.g. not in tab navigator context)
    tabBarHeight = insets.bottom + 60;
  }
  const fabBottom = tabBarHeight + 60;

  const theme = useTheme();

  const isAndroid = Platform.OS === "android";

  const ui = useMemo(
    () => ({
      surface: isAndroid ? theme.colors.surface : (isDark ? "#1C1C1E" : "#F5F5F5"), // neutral gray
      surface2: isAndroid ? theme.colors.elevation.level2 : (isDark ? "#2C2C2E" : "#EBEBEB"), // slightly darker gray for inputs
      border: isAndroid ? theme.colors.outlineVariant : (isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)"),
      text: isDark ? "#FFFFFF" : "#000000",
      mutedText: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
      backdrop: "rgba(0,0,0,0.45)",
      accent: isAndroid ? theme.colors.primary : (isDark ? "#8CF2D1" : "#1F6F5B"),
      accentSoft: isAndroid ? theme.colors.primaryContainer : (isDark ? "rgba(140,242,209,0.2)" : "rgba(31,111,91,0.12)"),
      hero: isAndroid ? theme.colors.elevation.level1 : (isDark ? "#1C1C1E" : "#F2F2F7"),
      heroAlt: isAndroid ? theme.colors.elevation.level2 : (isDark ? "#2C2C2E" : "#FFFFFF"),
    }),
    [isDark, theme, isAndroid],
  );



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
  const [isAndroidSearching, setIsAndroidSearching] = useState(false);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "wave">("wave");

  const getAccountColor = (item: AccountRow | PlaidAccount, index: number) => {
    const type = (("account_type" in item ? item.account_type : item.type) ?? "").toLowerCase();
    const isDebit = type === "debit" || type === "depository" || type === "checking" || type === "savings";
    const palette = isDebit
      ? ["#701D26", "#8A2431", "#5A1520", "#9B2B3A"] // DEBIT_PALETTE
      : ["#D86666", "#E07A7A", "#C95454", "#E39191"]; // CREDIT_PALETTE
    return palette[index % palette.length];
  };

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: "Search accounts...",
          onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
          hideWhenScrolling: true,
          tintColor: ui.accent,
          textColor: ui.text,
        },
      });
    }, [navigation, ui, isDark, router])
  );
  const [selectedDetailAccount, setSelectedDetailAccount] = useState<AccountRow | PlaidAccount | null>(null);

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

      // load accounts from user, where profile id == current user id
      if (!silent) setIsLoading(true);
      const { data, error } = await supabase
        .from("account")
        .select(
          "id, profile_id, created_at, account_name, account_type, balance, credit_limit, statement_duedate, payment_duedate, interest_rate, currency",
        )
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading accounts:", error);
        if (!silent) setIsLoading(false);
        return;
      }

      setAccounts((data as AccountRow[]) ?? []);

      // also load goals to calculate available balance
      try {
        const goalsData = await listGoals({ profile_id: userId });
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
      } catch (err) {
        console.error("Error loading goals for accounts:", err);
      }

      if (!silent) setIsLoading(false);
    },
    [userId],
  );

  // Plaid: connect bank handler (must be after loadAccounts)
  const handleConnectBank = useCallback(async (options?: { onBeforeOpen?: () => void; onError?: () => void }) => {
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
                await exchangePublicToken(success.publicToken, institutionName);
                Alert.alert("Success!", `${institutionName || "Bank"} connected successfully.`);
                await loadAccounts();
                getPlaidAccounts().then(setPlaidAccounts).catch(console.error);
              } catch (err) {
                console.error("Error exchanging token:", err);
                Alert.alert("Connection Error", "Bank connection failed. Please try again.");
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
      Alert.alert("Connection Error", "Could not start bank connection. Please try again.");
      setIsConnecting(false);
      options?.onError?.();
    }
  }, [loadAccounts]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts(true);
      // Also load Plaid accounts
      if (userId) {
        getPlaidAccounts()
          .then(setPlaidAccounts)
          .catch((err) => console.error("Error loading Plaid accounts:", err));
      }
    }, [loadAccounts, userId]),
  );

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
      const isLiability = (account.account_type ?? "").toLowerCase() === "credit";
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
    const manualAvail = accounts.reduce((sum, account) => sum + calculateAvailable(account), 0);
    const plaidAvail = plaidAccounts.reduce((sum, pa) => {
      const type = (pa.type ?? "").toLowerCase();
      const isLiability = type === "credit" || type === "loan";
      const avail = calculatePlaidAvailable(pa);
      return isLiability ? sum - avail : sum + avail;
    }, 0);
    return manualAvail + plaidAvail;
  }, [accounts, plaidAccounts, calculateAvailable, calculatePlaidAvailable]);

  const assetsCount = useMemo(() => {
    const manualAssets = accounts.filter(a => (a.account_type ?? "").toLowerCase() !== "credit").length;
    const plaidAssets = plaidAccounts.filter(pa => {
      const type = (pa.type ?? "").toLowerCase();
      return type !== "credit" && type !== "loan";
    }).length;
    return manualAssets + plaidAssets;
  }, [accounts, plaidAccounts]);

  const liabilitiesCount = useMemo(() => {
    const manualLiabilities = accounts.filter(a => (a.account_type ?? "").toLowerCase() === "credit").length;
    const plaidLiabilities = plaidAccounts.filter(pa => {
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



  if (authLoading && !session) {
    return (
      <ThemedView style={[styles.container, { paddingTop: 16 + insets.top }]}>
        <ThemedText>Loading…</ThemedText>
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedView style={[styles.container, { paddingTop: 16 + insets.top }]}>
        <ThemedText type="title">Accounts</ThemedText>
        <ThemedText>Please sign in to view accounts.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      {Platform.OS === "android" && (
        isAndroidSearching ? (
          <Appbar.Header mode="small" elevated>
            <Searchbar
              placeholder="Search accounts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              onBlur={() => {
                if (!searchQuery.trim()) {
                  setIsAndroidSearching(false);
                }
              }}
              onIconPress={() => { setSearchQuery(""); setIsAndroidSearching(false); }}
              icon="arrow-left"
              style={{ flex: 1, marginHorizontal: 4, backgroundColor: theme.colors.elevation.level5 }}
              inputStyle={{ color: theme.colors.onSurface }}
              iconColor={theme.colors.onSurface}
            />
          </Appbar.Header>
        ) : (
          <Appbar.Header mode="small" elevated>
            <Appbar.Content
              title="Accounts"
              titleStyle={{ fontWeight: "bold" }}
            />
            <Appbar.Action
              icon="magnify"
              onPress={() => setIsAndroidSearching(true)}
            />
          </Appbar.Header>
        )
      )}

      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 120, paddingTop: Platform.OS === 'android' ? 16 : 0 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadAccounts}
            tintColor={ui.text}
          />
        }
      >
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <View
            style={[
              styles.bgOrb,
              styles.bgOrbTop,
              { backgroundColor: ui.accentSoft },
            ]}
          />
          <View
            style={[
              styles.bgOrb,
              styles.bgOrbBottom,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.65)",
              },
            ]}
          />
          <View style={[styles.bgRing, { borderColor: ui.accentSoft }]} />
        </View>


        <View style={styles.toolbarRow}>
          <View style={{ flex: 1 }} />
          <AccountsViewToggle
            value={viewMode}
            onChange={setViewMode}
            borderColor={ui.border}
            backgroundColor={ui.surface2}
            activeColor={ui.accent}
            inactiveColor={ui.mutedText}
          />
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
            Manual Accounts
          </ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: ui.mutedText }]}>
            {filteredManualAccounts.length} account{filteredManualAccounts.length !== 1 ? "s" : ""}
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
              {isLoading
                ? "Loading..."
                : "No matches found."}
            </ThemedText>
          </View>
        ) : (
          filteredManualAccounts.map((item, idx) => {
            const cardProps = {
              title: item.account_name ?? "Unnamed account",
              balance: formatMoney(item.balance ?? 0),
              typeLabel: item.account_type ? item.account_type.charAt(0).toUpperCase() + item.account_type.slice(1) : "-",
              dateLabel: item.currency ?? "CAD",
              color: getAccountColor(item, idx),
              onPress: () => {
                setSelectedDetailAccount(item);
                setDetailModalVisible(true);
              },
            };

            return viewMode === "wave" ? (
              <AccountWaveCard key={item.id} {...cardProps} />
            ) : (
              <AccountListCard key={item.id} {...cardProps} />
            );
          })
        )}

        {/* Linked Banks (Plaid) */}
        {filteredPlaidAccounts.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
                Linked Banks
              </ThemedText>
              <ThemedText
                style={[styles.sectionSubtitle, { color: ui.mutedText }]}
              >
                {filteredPlaidAccounts.length} account{filteredPlaidAccounts.length !== 1 ? "s" : ""}
              </ThemedText>
            </View>

            {filteredPlaidAccounts.map((pa, idx) => {
              const cardProps = {
                title: pa.name,
                balance: formatMoney(pa.balances.current ?? 0),
                typeLabel: pa.type.charAt(0).toUpperCase() + pa.type.slice(1),
                dateLabel: pa.subtype ? pa.subtype.charAt(0).toUpperCase() + pa.subtype.slice(1) : "Bank",
                color: getAccountColor(pa, idx + accounts.length),
                onPress: () => {
                  setSelectedDetailAccount(pa);
                  setDetailModalVisible(true);
                },
              };
              return viewMode === "wave" ? (
                <AccountWaveCard key={pa.account_id} {...cardProps} waveAngle={idx % 2 === 0 ? -8 : 8} />
              ) : (
                <AccountListCard key={pa.account_id} {...cardProps} />
              );
            })}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => setAddSourceModalOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          isAndroid && {
            width: 80,
            height: 80,
            borderRadius: 20,
            right: 16,
          },
          {
            backgroundColor: isAndroid ? theme.colors.primary : ui.text,
            opacity: pressed ? 0.8 : 1,
            bottom: fabBottom,
            elevation: isAndroid ? 5 : 6,
          },
        ]}
      >
        <IconSymbol name="plus" size={isAndroid ? 36 : 32} color={isAndroid ? theme.colors.onPrimary : ui.surface} />
      </Pressable>

      {/* Select Source Modal */}
      {
        addSourceModalOpen && (
          <Pressable
            style={[
              styles.modalBackdrop,
              StyleSheet.absoluteFill,
              { backgroundColor: ui.backdrop, zIndex: 100 },
            ]}
            onPress={() => setAddSourceModalOpen(false)}
          >
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: ui.surface2, borderColor: ui.border },
              ]}
              onPress={() => { }}
            >
              <ThemedText type="defaultSemiBold" style={{ fontSize: 18, marginBottom: 8 }}>
                Add Account
              </ThemedText>
              <ThemedText style={{ color: ui.mutedText, marginBottom: 20 }}>
                How would you like to add your new account?
              </ThemedText>

              <Pressable
                style={[
                  styles.modalOption,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    gap: 12
                  },
                ]}
                onPress={() => {
                  setAddSourceModalOpen(false);
                  setCreateModalOpen(true);
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ui.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="edit-2" size={18} color={ui.text} />
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">Manual Account</ThemedText>
                  <ThemedText style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}>Enter transactions yourself</ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.modalOption,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    gap: 12
                  },
                ]}
                disabled={isConnecting}
                onPress={() => {
                  handleConnectBank({
                    onBeforeOpen: () => setAddSourceModalOpen(false),
                    onError: () => setAddSourceModalOpen(false)
                  });
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ui.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
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
                  <ThemedText style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}>Sync automatically via Plaid</ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.modalOption,
                  styles.modalCancel,
                  { borderColor: "transparent", backgroundColor: "transparent", marginTop: 8 },
                ]}
                onPress={() => setAddSourceModalOpen(false)}
              >
                <ThemedText type="defaultSemiBold" style={{ color: ui.mutedText }}>Cancel</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        )
      }

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
            paddingTop: Platform.OS === "ios" ? 8 : (16 + insets.top),
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft} />
            <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>Add Account</ThemedText>
            <View style={styles.modalHeaderRight}>
              <Pressable
                onPress={() => setCreateModalOpen(false)}
                hitSlop={20}
                style={[styles.modalCloseButton, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)" }]}
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
              onChange={(date) => setCreateStatementDate(toLocalISOString(date))}
              ui={ui}
            />

            <DateTimePickerField
              label="Payment Due Date"
              value={parseLocalDate(createPaymentDate)}
              onChange={(date) => setCreatePaymentDate(toLocalISOString(date))}
              ui={ui}
            />

            <Pressable
              onPress={createAccount}
              disabled={!canCreate || isLoading}
              style={[
                styles.button,
                { borderColor: ui.border, backgroundColor: ui.text },
                (!canCreate || isLoading) && styles.buttonDisabled,
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
                Create
              </ThemedText>
            </Pressable>
          </ScrollView>

          {/* Account Type Selection Modal (Add) - Overlay */}
          {typeModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setTypeModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">
                  Select account type
                </ThemedText>
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
                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setTypeModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}
        </ThemedView>
      </Modal>

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
                    getPlaidAccounts().then(setPlaidAccounts).catch(console.error);
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
              paddingTop: Platform.OS === "ios" ? 8 : (16 + insets.top),
              paddingBottom: 16 + insets.bottom,
            }}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft} />
              <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>Edit Account</ThemedText>
              <View style={styles.modalHeaderRight}>
                <Pressable
                  onPress={() => setEditingAccount(null)}
                  hitSlop={20}
                  style={[styles.modalCloseButton, { backgroundColor: isAndroid ? theme.colors.surfaceVariant : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)") }]}
                >
                  <Feather name="x" size={18} color={ui.text} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
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
                <ThemedText type="defaultSemiBold">Interest Rate (%)</ThemedText>
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
                onChange={(date) => setEditStatementDate(toLocalISOString(date))}
                ui={ui}
              />

              <DateTimePickerField
                label="Payment Due Date"
                value={parseLocalDate(editPaymentDate)}
                onChange={(date) => setEditPaymentDate(toLocalISOString(date))}
                ui={ui}
              />

              <Pressable
                onPress={updateAccount}
                style={[
                  styles.button,
                  {
                    backgroundColor: isAndroid ? theme.colors.primary : ui.text,
                    borderColor: ui.border,
                    alignSelf: "center",
                    width: "100%",
                    alignItems: "center",
                    marginTop: 8,
                  },
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: isAndroid ? theme.colors.onPrimary : ui.surface }} // Invert text color
                >
                  Save Changes
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => editingAccount && deleteAccount(editingAccount.id)}
                disabled={isLoading}
                style={[
                  styles.deleteAction,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                  isLoading && styles.buttonDisabled,
                ]}
              >
                <ThemedText style={{ color: "#FF3B30" }}>
                  Delete Account
                </ThemedText>
              </Pressable>
            </ScrollView>
          </ThemedView>
        </Modal>
      </AccountDetailModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 16,
  },
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.7,
  },
  bgOrbTop: {
    width: 260,
    height: 260,
    top: -160,
    right: -90,
  },
  bgOrbBottom: {
    width: 220,
    height: 220,
    bottom: -80,
    left: -70,
  },
  bgRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    top: 180,
    right: -130,
    opacity: 0.35,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  headerTitleWrap: {
    marginTop: 4,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: Tokens.font.headingFamily,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Tokens.font.family,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroLabel: {
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  heroValue: {
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    fontSize: 36,
    lineHeight: 38,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontSize: 12,
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statPill: {
    flexGrow: 1,
    flexBasis: "47%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  statLabel: {
    fontFamily: Tokens.font.family,
    fontSize: 12,
  },
  statValue: {
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    fontSize: 16,
  },
  statValueSmall: {
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontSize: 15,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    overflow: "hidden",
  },
  chartGlow: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.6,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartTitle: {
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontSize: 16,
  },
  chartSubtitle: {
    fontFamily: Tokens.font.family,
    fontSize: 12,
    marginTop: 2,
  },
  chartChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chartChipText: {
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    fontSize: 12,
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
  toolbarRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  viewPill: {
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  viewDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
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
    fontSize: 16,
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
    marginTop: 20,
    marginBottom: 4,
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
    paddingVertical: 16,
    marginTop: 4,
  },
  accountCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: "hidden",
    gap: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitleGroup: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: "#F6F6F6",
    fontSize: 20,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  cardTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cardTagText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 11,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    letterSpacing: 0.3,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.7,
  },
  cardRing: {
    position: "absolute",
    bottom: -80,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    opacity: 0.5,
  },
  cardBalance: {
    color: "#FFFFFF",
    fontSize: 34,
    paddingTop: 16,
    marginTop: -8,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  cardMetaText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  cardSubText: {
    color: "rgba(255,255,255,0.9)",
    marginTop: -2,
    fontSize: 13,
    fontFamily: Tokens.font.family,
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
    paddingVertical: 10,
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteAction: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
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



