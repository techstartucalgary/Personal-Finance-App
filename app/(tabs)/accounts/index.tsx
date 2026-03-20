import Feather from "@expo/vector-icons/Feather";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useTheme } from "react-native-paper";
import type { LinkExit, LinkSuccess } from "react-native-plaid-link-sdk";
import { create as plaidCreate, destroy as plaidDestroy, open as plaidOpen } from "react-native-plaid-link-sdk";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFocusEffect, useNavigation, useRouter } from "expo-router";

import { AccountCardCarousel, type UnifiedAccount } from "@/components/accounts/AccountCardCarousel";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SelectionModal } from "@/components/ui/SelectionModal";
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

// ── Color palette ──────────────────────────────────

const DEBIT_PALETTE = ["#701D26", "#8A2431", "#5A1520", "#9B2B3A"];
const CREDIT_PALETTE = ["#D86666", "#E07A7A", "#C95454", "#E39191"];

function getAccountColor(isLiability: boolean, index: number) {
  const palette = isLiability ? CREDIT_PALETTE : DEBIT_PALETTE;
  return palette[index % palette.length];
}

// ── Format helpers ─────────────────────────────────

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);

// ── Main Screen ────────────────────────────────────

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  let tabBarHeight = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = insets.bottom + 60;
  }

  const theme = useTheme();

  const ui = useMemo(
    () => ({
      surface: isDark ? "#1C1C1E" : "#FFFFFF",
      surface2: isDark ? "#2C2C2E" : "#F2F2F7",
      border: isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)",
      text: isDark ? "#FFFFFF" : "#000000",
      mutedText: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
      backdrop: "rgba(0,0,0,0.45)",
      accent: isDark ? "#8CF2D1" : "#1F6F5B",
      accentSoft: isDark ? "rgba(140,242,209,0.2)" : "rgba(31,111,91,0.12)",
      danger: "#D32F2F",
    }),
    [isDark],
  );

  const userId = session?.user.id;

  // ── Data state ─────────────────────────────────────

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

  // ── Carousel state ─────────────────────────────────

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Create form state ──────────────────────────────

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("credit");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [createBalance, setCreateBalance] = useState("");
  const [createLimit, setCreateLimit] = useState("");
  const [createInterest, setCreateInterest] = useState("");
  const [createStatementDate, setCreateStatementDate] = useState("");
  const [createPaymentDate, setCreatePaymentDate] = useState("");
  const [createCurrency, setCreateCurrency] = useState("CAD");

  // ── Inline edit state ──────────────────────────────

  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editInterest, setEditInterest] = useState("");
  const [editStatementDate, setEditStatementDate] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editCurrency, setEditCurrency] = useState("");

  // Track original values for dirty detection
  const [origEditValues, setOrigEditValues] = useState<Record<string, string>>({});

  // ── Plaid state ────────────────────────────────────

  const [isConnecting, setIsConnecting] = useState(false);

  const canCreate = useMemo(
    () => !!userId && name.trim().length > 0,
    [userId, name],
  );

  // ── Header search ──────────────────────────────────

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
    }, [navigation, ui]),
  );

  // ── Data loading ───────────────────────────────────

  const loadAccounts = useCallback(
    async (silent = false) => {
      if (!userId) { setAccounts([]); return; }
      const hasData = accounts.length > 0 || plaidAccounts.length > 0;
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
        setGoals(
          (goalsData as any[])?.map((g) => ({
            id: g.id, name: g.name, target_amount: g.target_amount,
            current_amount: g.current_amount, target_date: g.target_date,
            linked_account: g.linked_account, linked_plaid_account: g.linked_plaid_account,
          })) ?? [],
        );
        setPlaidAccounts(pAccounts ?? []);
      } catch (err) {
        console.error("Error loading accounts data:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, accounts.length, plaidAccounts.length],
  );

  useFocusEffect(
    useCallback(() => {
      loadAccounts(true);
    }, [loadAccounts]),
  );

  // ── Plaid connect ──────────────────────────────────

  const handleConnectBank = useCallback(async (options?: { onBeforeOpen?: () => void; onError?: () => void }) => {
    try {
      setIsConnecting(true);
      const token = await getLinkToken();
      await plaidDestroy();
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

  // ── CRUD operations ────────────────────────────────

  const createAccount = useCallback(async () => {
    if (!userId || !canCreate) return;
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

    const payload = {
      profile_id: userId,
      account_name: name.trim(),
      account_type: type,
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

    setName(""); setType("credit"); setCreateBalance(""); setCreateLimit("");
    setCreateInterest(""); setCreateStatementDate(""); setCreatePaymentDate(""); setCreateCurrency("CAD");
    setCreateModalOpen(false);
    await loadAccounts();
    setIsLoading(false);
  }, [userId, canCreate, name, type, createBalance, createLimit, createInterest, createStatementDate, createPaymentDate, createCurrency, loadAccounts]);

  const updateAccount = useCallback(async () => {
    if (!userId) return;
    // Find the current manual account from the carousel state
    const allAccounts = accounts;
    const allPlaid = plaidAccounts;
    const q = searchQuery.trim().toLowerCase();
    // Build a quick unified list to find the active item
    let idx = 0;
    let activeAccount: AccountRow | null = null;
    for (const acc of allAccounts) {
      const nameStr = acc.account_name?.toLowerCase() ?? "";
      const typeStr = acc.account_type?.toLowerCase() ?? "";
      if (q && !nameStr.includes(q) && !typeStr.includes(q)) continue;
      if (idx === activeCardIndex) { activeAccount = acc; break; }
      idx++;
    }
    if (!activeAccount) return;
    setIsLoading(true);

    const cleanText = (value: string, fallback?: string | null) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : (fallback ?? undefined);
    };
    const cleanNumber = (value: string, fallback?: number | null) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return fallback ?? 0;
      const parsed = parseFloat(trimmed);
      return Number.isFinite(parsed) ? parsed : (fallback ?? 0);
    };

    const payload = {
      account_name: cleanText(editName, activeAccount.account_name),
      balance: cleanNumber(editBalance, activeAccount.balance),
      credit_limit: cleanNumber(editLimit, activeAccount.credit_limit),
      interest_rate: cleanNumber(editInterest, activeAccount.interest_rate),
      statement_duedate: cleanText(editStatementDate, activeAccount.statement_duedate),
      payment_duedate: cleanText(editPaymentDate, activeAccount.payment_duedate),
      currency: cleanText(editCurrency, activeAccount.currency),
    };

    try {
      await updateAccountApi({ id: activeAccount.id, profile_id: userId, update: payload });
    } catch (error) {
      console.error("Error updating account:", error);
      Alert.alert("Could not update account", "Please try again.");
      setIsLoading(false);
      return;
    }

    await loadAccounts();
    setIsLoading(false);
  }, [userId, accounts, plaidAccounts, searchQuery, activeCardIndex, editName, editBalance, editLimit, editInterest, editStatementDate, editPaymentDate, editCurrency, loadAccounts]);

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
              setActiveCardIndex(0);
              setIsLoading(false);
            },
          },
        ],
      );
    },
    [userId, loadAccounts],
  );

  // ── Build unified account list ─────────────────────

  const unifiedAccounts: UnifiedAccount[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list: UnifiedAccount[] = [];
    let colorIdx = 0;

    // Manual accounts
    accounts.forEach((acc) => {
      const nameStr = acc.account_name?.toLowerCase() ?? "";
      const typeStr = acc.account_type?.toLowerCase() ?? "";
      if (q && !nameStr.includes(q) && !typeStr.includes(q)) return;

      const isLiability = typeStr === "credit";
      list.push({
        key: `manual-${acc.id}`,
        kind: "manual",
        color: getAccountColor(isLiability, colorIdx),
        name: acc.account_name ?? "Unnamed Account",
        balance: formatMoney(acc.balance ?? 0),
        typeLabel: acc.account_type ? acc.account_type.charAt(0).toUpperCase() + acc.account_type.slice(1) : "Account",
        subtitle: acc.currency ?? "CAD",
        sourceLabel: "Manual",
        data: acc,
      });
      colorIdx++;
    });

    // Plaid accounts
    plaidAccounts.forEach((pa) => {
      const nameStr = pa.name?.toLowerCase() ?? "";
      const typeStr = pa.type?.toLowerCase() ?? "";
      if (q && !nameStr.includes(q) && !typeStr.includes(q)) return;

      const isLiability = typeStr === "credit" || typeStr === "loan";
      list.push({
        key: `plaid-${pa.account_id}`,
        kind: "plaid",
        color: getAccountColor(isLiability, colorIdx),
        name: pa.name,
        balance: formatMoney(pa.balances.current ?? 0),
        typeLabel: pa.type.charAt(0).toUpperCase() + pa.type.slice(1),
        subtitle: pa.subtype ? pa.subtype.charAt(0).toUpperCase() + pa.subtype.slice(1) : "Bank",
        sourceLabel: "Plaid",
        data: pa,
      });
      colorIdx++;
    });


    return list;
  }, [accounts, plaidAccounts, searchQuery]);

  // ── Active account derived state ───────────────────

  const activeItem = unifiedAccounts[activeCardIndex] ?? null;
  const activeManualAccount: AccountRow | null =
    activeItem?.kind === "manual" ? activeItem.data : null;
  const activePlaidAccount: PlaidAccount | null =
    activeItem?.kind === "plaid" ? activeItem.data : null;


  // Sync edit fields when active card changes
  useEffect(() => {
    if (activeManualAccount) {
      const vals = {
        name: activeManualAccount.account_name ?? "",
        balance: activeManualAccount.balance?.toString() ?? "",
        limit: activeManualAccount.credit_limit?.toString() ?? "",
        interest: activeManualAccount.interest_rate?.toString() ?? "",
        statementDate: activeManualAccount.statement_duedate ?? "",
        paymentDate: activeManualAccount.payment_duedate ?? "",
        currency: activeManualAccount.currency ?? "CAD",
      };
      setEditName(vals.name);
      setEditBalance(vals.balance);
      setEditLimit(vals.limit);
      setEditInterest(vals.interest);
      setEditStatementDate(vals.statementDate);
      setEditPaymentDate(vals.paymentDate);
      setEditCurrency(vals.currency);
      setOrigEditValues(vals);
    }
  }, [activeManualAccount?.id]);

  // Dirty detection
  const isDirty = useMemo(() => {
    if (!activeManualAccount) return false;
    return (
      editName !== origEditValues.name ||
      editBalance !== origEditValues.balance ||
      editLimit !== origEditValues.limit ||
      editInterest !== origEditValues.interest ||
      editStatementDate !== origEditValues.statementDate ||
      editPaymentDate !== origEditValues.paymentDate ||
      editCurrency !== origEditValues.currency
    );
  }, [editName, editBalance, editLimit, editInterest, editStatementDate, editPaymentDate, editCurrency, origEditValues, activeManualAccount]);

  // ── Plaid helpers ──────────────────────────────────

  const plaidAvailable = useMemo(() => {
    if (!activePlaidAccount) return null;
    const totalBalance = activePlaidAccount.balances.current ?? 0;
    const accountGoals = goals.filter((g) => g.linked_plaid_account === activePlaidAccount.account_id);
    const allocated = accountGoals.reduce((sum, g) => sum + (g.current_amount ?? 0), 0);
    return totalBalance - allocated;
  }, [activePlaidAccount, goals]);

  // ── Render ─────────────────────────────────────────

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
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 80, paddingTop: Platform.OS === "android" ? 16 : 0 },
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
        {/* ── Card Carousel ──────────────────────────── */}
        <AccountCardCarousel
          accounts={unifiedAccounts}
          activeIndex={activeCardIndex}
          onIndexChange={setActiveCardIndex}
          onAddPress={() => setAddSourceModalOpen(true)}
          ui={ui}
        />

        {/* ── Detail Section ─────────────────────────── */}
        {activeManualAccount && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>ACCOUNT DETAILS</ThemedText>
            </View>

            <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
              {/* Name */}
              <View style={styles.inputRow}>
                <IconSymbol name="signature" size={20} color={ui.mutedText} />
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Account Name"
                  placeholderTextColor={ui.mutedText}
                  style={[styles.rowInput, { color: ui.text }]}
                />
              </View>
              <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

              {/* Balance */}
              <View style={styles.inputRow}>
                <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
                <ThemedText style={styles.rowLabel}>Balance</ThemedText>
                <TextInput
                  value={editBalance}
                  onChangeText={setEditBalance}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={ui.mutedText}
                  style={[styles.rowValueInput, { color: ui.text }]}
                />
              </View>
              <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

              {/* Credit Limit */}
              <View style={styles.inputRow}>
                <IconSymbol name="creditcard" size={20} color={ui.mutedText} />
                <ThemedText style={styles.rowLabel}>Credit Limit</ThemedText>
                <TextInput
                  value={editLimit}
                  onChangeText={setEditLimit}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={ui.mutedText}
                  style={[styles.rowValueInput, { color: ui.text }]}
                />
              </View>
              <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

              {/* Interest Rate */}
              <View style={styles.inputRow}>
                <IconSymbol name="percent" size={20} color={ui.mutedText} />
                <ThemedText style={styles.rowLabel}>Interest Rate</ThemedText>
                <TextInput
                  value={editInterest}
                  onChangeText={setEditInterest}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={ui.mutedText}
                  style={[styles.rowValueInput, { color: ui.text }]}
                />
              </View>
              <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

              {/* Currency */}
              <View style={styles.inputRow}>
                <IconSymbol name="globe" size={20} color={ui.mutedText} />
                <ThemedText style={styles.rowLabel}>Currency</ThemedText>
                <TextInput
                  value={editCurrency}
                  onChangeText={setEditCurrency}
                  autoCapitalize="characters"
                  placeholder="CAD"
                  placeholderTextColor={ui.mutedText}
                  style={[styles.rowValueInput, { color: ui.text }]}
                />
              </View>
            </View>

            {/* Dates section */}
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>DUE DATES</ThemedText>
            </View>

            <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
              <DateTimePickerField
                label="Statement Date"
                value={parseLocalDate(editStatementDate)}
                onChange={(date) => setEditStatementDate(toLocalISOString(date))}
                ui={ui}
                icon="calendar"
              />
              <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
              <DateTimePickerField
                label="Payment Date"
                value={parseLocalDate(editPaymentDate)}
                onChange={(date) => setEditPaymentDate(toLocalISOString(date))}
                ui={ui}
                icon="calendar.badge.clock"
              />
            </View>

            {/* Save + Delete */}
            {isDirty && (
              <Pressable
                onPress={updateAccount}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: isDark ? "#FFFFFF" : "#000000",
                    borderColor: ui.border,
                    marginTop: 24,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={isDark ? "#1C1C1E" : "#FFFFFF"} />
                ) : (
                  <ThemedText type="defaultSemiBold" style={{ color: isDark ? "#1C1C1E" : "#FFFFFF" }}>
                    Save Changes
                  </ThemedText>
                )}
              </Pressable>
            )}

            <Pressable
              onPress={() => deleteAccount(activeManualAccount.id)}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface2,
                  marginTop: isDirty ? 12 : 24,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: ui.danger }}>
                Delete Account
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* ── Plaid Account Detail (Read Only) ───────── */}
        {activePlaidAccount && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>ACCOUNT DETAILS</ThemedText>
            </View>

            <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
              <View style={styles.inputRow}>
                <IconSymbol name="signature" size={20} color={ui.mutedText} />
                <ThemedText style={styles.rowLabel}>Name</ThemedText>
                <ThemedText style={[styles.rowValue, { color: ui.text }]}>{activePlaidAccount.name}</ThemedText>
              </View>
              <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

              <View style={styles.inputRow}>
                <IconSymbol name="creditcard" size={20} color={ui.mutedText} />
                <ThemedText style={styles.rowLabel}>Type</ThemedText>
                <ThemedText style={[styles.rowValue, { color: ui.text }]}>
                  {activePlaidAccount.type.charAt(0).toUpperCase() + activePlaidAccount.type.slice(1)}
                  {activePlaidAccount.subtype ? ` · ${activePlaidAccount.subtype.charAt(0).toUpperCase() + activePlaidAccount.subtype.slice(1)}` : ""}
                </ThemedText>
              </View>
              <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

              <View style={styles.inputRow}>
                <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
                <ThemedText style={styles.rowLabel}>Balance</ThemedText>
                <ThemedText style={[styles.rowValue, { color: ui.text }]}>
                  {formatMoney(activePlaidAccount.balances.current ?? 0)}
                </ThemedText>
              </View>
              <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

              <View style={styles.inputRow}>
                <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
                <ThemedText style={styles.rowLabel}>Available</ThemedText>
                <ThemedText style={[styles.rowValue, { color: ui.accent }]}>
                  {formatMoney(plaidAvailable ?? activePlaidAccount.balances.available ?? 0)}
                </ThemedText>
              </View>

              {activePlaidAccount.mask && (
                <>
                  <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                  <View style={styles.inputRow}>
                    <IconSymbol name="lock" size={20} color={ui.mutedText} />
                    <ThemedText style={styles.rowLabel}>Last 4</ThemedText>
                    <ThemedText style={[styles.rowValue, { color: ui.text }]}>•••• {activePlaidAccount.mask}</ThemedText>
                  </View>
                </>
              )}

              {activePlaidAccount.institution_name && (
                <>
                  <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                  <View style={styles.inputRow}>
                    <IconSymbol name="building.2" size={20} color={ui.mutedText} />
                    <ThemedText style={styles.rowLabel}>Institution</ThemedText>
                    <ThemedText style={[styles.rowValue, { color: ui.text }]}>{activePlaidAccount.institution_name}</ThemedText>
                  </View>
                </>
              )}
            </View>

            <Pressable
              onPress={() => {
                Alert.alert(
                  "Unlink Account?",
                  "Are you sure you want to unlink this account? Your data will be removed.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Unlink",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          if (!activePlaidAccount.plaid_item_id) {
                            Alert.alert("Error", "No item ID found.");
                            return;
                          }
                          await removePlaidItem(activePlaidAccount.plaid_item_id);
                          await loadAccounts();
                          setActiveCardIndex(0);
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
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface2,
                  marginTop: 24,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: ui.danger }}>
                Unlink Account
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Empty state when no accounts */}
        {accounts.length === 0 && plaidAccounts.length === 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 20, alignItems: "center" }}>
            <ThemedText style={{ color: ui.mutedText, textAlign: "center" }}>
              No accounts yet. Swipe left on the last card to add one!
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* ── Add Source Modal ──────────────────────────── */}
      <SelectionModal
        visible={addSourceModalOpen}
        onClose={() => setAddSourceModalOpen(false)}
        title="Add Account"
        ui={ui}
      >
        <ThemedText style={{ color: ui.mutedText, marginBottom: 12, textAlign: "center" }}>
          How would you like to add your new account?
        </ThemedText>

        <Pressable
          style={[
            styles.modalOption,
            {
              borderColor: ui.border, backgroundColor: ui.surface,
              flexDirection: "row", justifyContent: "flex-start",
              paddingHorizontal: 16, paddingVertical: 14, gap: 12,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
          onPress={() => { setAddSourceModalOpen(false); setCreateModalOpen(true); }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ui.surface2, alignItems: "center", justifyContent: "center" }}>
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
              borderColor: ui.border, backgroundColor: ui.surface,
              flexDirection: "row", justifyContent: "flex-start",
              paddingHorizontal: 16, paddingVertical: 14, gap: 12,
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
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ui.accentSoft, alignItems: "center", justifyContent: "center" }}>
            {isConnecting ? (
              <ActivityIndicator size="small" color={ui.accent} />
            ) : (
              <Feather name="link" size={18} color={ui.accent} />
            )}
          </View>
          <View>
            <ThemedText type="defaultSemiBold">{isConnecting ? "Connecting..." : "Connect Bank"}</ThemedText>
            <ThemedText style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}>Sync automatically via Plaid</ThemedText>
          </View>
        </Pressable>
      </SelectionModal>

      {/* ── Create Account Modal ─────────────────────── */}
      <Modal
        visible={createModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <ThemedView style={{ flex: 1, backgroundColor: ui.surface, padding: 16, paddingTop: Platform.OS === "ios" ? 12 : (16 + insets.top), paddingBottom: 16 + insets.bottom }}>
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
              style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]}
            />

            <View style={[styles.pickerContainer, { borderColor: ui.border, backgroundColor: ui.surface }]}>
              <ThemedText type="defaultSemiBold">Account type</ThemedText>
              <Pressable
                onPress={() => setTypeModalOpen(true)}
                style={[styles.dropdownButton, { borderColor: ui.border, backgroundColor: ui.surface2 }]}
              >
                <ThemedText>{type === "credit" ? "Credit" : "Debit"}</ThemedText>
              </Pressable>
            </View>

            <ThemedText type="defaultSemiBold">Balance</ThemedText>
            <TextInput value={createBalance} onChangeText={setCreateBalance} keyboardType="numeric" style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]} />

            <ThemedText type="defaultSemiBold">Credit Limit</ThemedText>
            <TextInput value={createLimit} onChangeText={setCreateLimit} keyboardType="numeric" style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]} />

            <ThemedText type="defaultSemiBold">Interest Rate (%)</ThemedText>
            <TextInput value={createInterest} onChangeText={setCreateInterest} keyboardType="numeric" style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]} />

            <ThemedText type="defaultSemiBold">Currency</ThemedText>
            <TextInput value={createCurrency} onChangeText={setCreateCurrency} autoCapitalize="characters" style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]} />

            <DateTimePickerField label="Statement Due Date" value={parseLocalDate(createStatementDate)} onChange={(date) => setCreateStatementDate(toLocalISOString(date))} ui={ui} />
            <DateTimePickerField label="Payment Due Date" value={parseLocalDate(createPaymentDate)} onChange={(date) => setCreatePaymentDate(toLocalISOString(date))} ui={ui} />

            <Pressable
              onPress={createAccount}
              disabled={!canCreate || isLoading}
              style={[
                styles.createButton,
                { borderColor: ui.border, backgroundColor: ui.text },
                (!canCreate || isLoading) && styles.buttonDisabled,
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>Create</ThemedText>
            </Pressable>
          </ScrollView>

          <SelectionModal visible={typeModalOpen} onClose={() => setTypeModalOpen(false)} title="Select Account Type" ui={ui}>
            <Pressable style={[styles.modalOption, { borderColor: ui.border, backgroundColor: ui.surface }]} onPress={() => { setType("credit"); setTypeModalOpen(false); }}>
              <ThemedText>Credit</ThemedText>
            </Pressable>
            <Pressable style={[styles.modalOption, { borderColor: ui.border, backgroundColor: ui.surface }]} onPress={() => { setType("debit"); setTypeModalOpen(false); }}>
              <ThemedText>Debit</ThemedText>
            </Pressable>
          </SelectionModal>
        </ThemedView>
      </Modal>
    </>
  );
}

// ── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 16,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 16,
  },
  // ── Grouped-row styles (matching EditTransactionModal) ──
  sectionHeader: {
    paddingHorizontal: 4,
    marginBottom: 10,
    marginTop: 16,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.6,
  },
  groupCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  rowValue: {
    fontSize: 16,
    textAlign: "right",
  },
  rowInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  rowValueInput: {
    fontSize: 16,
    textAlign: "right",
    padding: 0,
    minWidth: 80,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  // ── Buttons ──
  saveButton: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteButton: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  createButton: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonDisabled: { opacity: 0.5 },
  // ── Modal styles ──
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
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
  modalHeaderLeft: { width: 44 },
  modalHeaderRight: { width: 44, alignItems: "flex-end" },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Input styles ──
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
});
