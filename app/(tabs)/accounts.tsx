import Feather from "@expo/vector-icons/Feather";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFocusEffect, useRouter } from "expo-router";

import { Tokens } from "@/constants/authTokens";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  createAccount as createAccountApi,
  deleteAccount as deleteAccountApi,
  updateAccount as updateAccountApi,
} from "@/utils/accounts";
import { listGoals } from "@/utils/goals";
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
};

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();

  const router = useRouter();

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

  const ui = useMemo(
    () => ({
      surface: isDark ? "#121212" : "#ffffff",
      surface2: isDark ? "#1a1a1a" : "#ffffff",
      border: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
      text: isDark ? "#ffffff" : "#111111",
      mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
      backdrop: "rgba(0,0,0,0.45)",
      accent: isDark ? "#8CF2D1" : "#1F6F5B",
      accentSoft: isDark ? "rgba(140,242,209,0.2)" : "rgba(31,111,91,0.12)",
      hero: isDark ? "#1C2027" : "#F9F4EC",
      heroAlt: isDark ? "#262B34" : "#FFFFFF",
    }),
    [isDark],
  );

  const heroAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const hero = Animated.timing(heroAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    });
    const list = Animated.timing(listAnim, {
      toValue: 1,
      duration: 480,
      delay: 120,
      useNativeDriver: true,
    });

    Animated.stagger(120, [hero, list]).start();
  }, [heroAnim, listAnim]);

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);

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
          })) ?? [],
        );
      } catch (err) {
        console.error("Error loading goals for accounts:", err);
      }

      if (!silent) setIsLoading(false);
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      loadAccounts(true);
    }, [loadAccounts]),
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
              setEditingAccount(null); // Close the modal
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
    return parsed.toLocaleDateString("en-CA", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0),
    [accounts],
  );

  const totalAvailable = useMemo(
    () =>
      accounts.reduce((sum, account) => sum + calculateAvailable(account), 0),
    [accounts, calculateAvailable],
  );

  const creditCount = useMemo(
    () =>
      accounts.filter(
        (account) => (account.account_type ?? "").toLowerCase() === "credit",
      ).length,
    [accounts],
  );

  const debitCount = useMemo(
    () =>
      accounts.filter(
        (account) => (account.account_type ?? "").toLowerCase() === "debit",
      ).length,
    [accounts],
  );

  const filteredAccounts = useMemo(() => {
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

  const heroAnimatedStyle = useMemo(
    () => ({
      opacity: heroAnim,
      transform: [
        {
          translateY: heroAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [12, 0],
          }),
        },
      ],
    }),
    [heroAnim],
  );

  const listAnimatedStyle = useMemo(
    () => ({
      opacity: listAnim,
      transform: [
        {
          translateY: listAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 0],
          }),
        },
      ],
    }),
    [listAnim],
  );

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
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: 12 + insets.top,
          backgroundColor: isDark ? "#16181C" : "#ECECF1",
        },
      ]}
    >
      <View pointerEvents="none" style={styles.bgDecor}>
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
            <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 88 },
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
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconBtn} hitSlop={8}>
              <Feather name="menu" size={28} color={ui.text} />
            </Pressable>
            <Pressable style={styles.iconBtn} hitSlop={8}>
              <Feather name="bell" size={24} color={ui.text} />
            </Pressable>
          </View>
          <Pressable onPress={() => router.push("/profile")}>
            <Feather name="user" size={24} color={ui.text} />
          </Pressable>
        </View>
        <View style={styles.headerTitleWrap}>
          <ThemedText style={[styles.headerTitle, { color: ui.text }]}>
            Accounts
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: ui.mutedText }]}>
            Track balances, due dates, and goals in one place.
          </ThemedText>
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: ui.border,
              backgroundColor: ui.surface2,
              display: "none",
            },
          ]}
        >
          <ThemedText type="defaultSemiBold">Your accounts</ThemedText>
          {accounts.length === 0 ? (
            <ThemedText>
              {isLoading ? "Loading..." : "No accounts yet. Add one below."}
            </ThemedText>
          ) : (
            accounts.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setEditingAccount(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface2,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">
                    {item.account_name ?? "Unnamed account"}
                  </ThemedText>
                  <ThemedText type="default">
                    {item.account_type
                      ? item.account_type.charAt(0).toUpperCase() +
                        item.account_type.slice(1)
                      : "-"}
                  </ThemedText>
                  <ThemedText>
                    Balance: {formatMoney(item.balance ?? 0)}
                  </ThemedText>
                  <ThemedText style={{ opacity: 0.7, fontSize: 13 }}>
                    Available: {formatMoney(calculateAvailable(item))}
                  </ThemedText>
                  <ThemedText>{item.currency}</ThemedText>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Animated.View style={heroAnimatedStyle}>
          <View
            style={[
              styles.heroCard,
              { borderColor: ui.border, backgroundColor: ui.hero },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View>
                <ThemedText style={[styles.heroLabel, { color: ui.mutedText }]}>
                  Total Balance
                </ThemedText>
                <ThemedText style={[styles.heroValue, { color: ui.text }]}>
                  {formatMoney(totalBalance)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.heroBadge,
                  { borderColor: ui.border, backgroundColor: ui.heroAlt },
                ]}
              >
                <Feather name="trending-up" size={14} color={ui.accent} />
                <ThemedText
                  style={[styles.heroBadgeText, { color: ui.text }]}
                >
                  Overview
                </ThemedText>
              </View>
            </View>
            <View style={styles.heroStatsRow}>
              <View
                style={[
                  styles.statPill,
                  { borderColor: ui.border, backgroundColor: ui.heroAlt },
                ]}
              >
                <ThemedText style={[styles.statLabel, { color: ui.mutedText }]}>
                  Available
                </ThemedText>
                <ThemedText style={[styles.statValue, { color: ui.text }]}>
                  {formatMoney(totalAvailable)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statPill,
                  { borderColor: ui.border, backgroundColor: ui.heroAlt },
                ]}
              >
                <ThemedText style={[styles.statLabel, { color: ui.mutedText }]}>
                  Accounts
                </ThemedText>
                <ThemedText style={[styles.statValue, { color: ui.text }]}>
                  {accounts.length}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statPill,
                  { borderColor: ui.border, backgroundColor: ui.heroAlt },
                ]}
              >
                <ThemedText style={[styles.statLabel, { color: ui.mutedText }]}>
                  Credit / Debit
                </ThemedText>
                <ThemedText
                  style={[styles.statValueSmall, { color: ui.text }]}
                >
                  {creditCount} / {debitCount}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={listAnimatedStyle}>
          <View
            style={[
              styles.chartCard,
              { borderColor: ui.border, backgroundColor: ui.surface2 },
            ]}
          >
            <View
              pointerEvents="none"
              style={[styles.chartGlow, { backgroundColor: ui.accentSoft }]}
            />
            <View style={styles.chartHeader}>
              <View>
                <ThemedText style={[styles.chartTitle, { color: ui.text }]}>
                  Balance Trend
                </ThemedText>
                <ThemedText
                  style={[styles.chartSubtitle, { color: ui.mutedText }]}
                >
                  Last 4 months
                </ThemedText>
              </View>
              <View
                style={[
                  styles.chartChip,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
              >
                <Feather name="bar-chart-2" size={14} color={ui.accent} />
                <ThemedText style={[styles.chartChipText, { color: ui.text }]}>
                  Insights
                </ThemedText>
              </View>
            </View>
            <View style={styles.chartRow}>
              <View style={styles.yAxis}>
                <ThemedText style={[styles.yLabel, { color: ui.mutedText }]}>
                  50k
                </ThemedText>
                <ThemedText style={[styles.yLabel, { color: ui.mutedText }]}>
                  20k
                </ThemedText>
                <ThemedText style={[styles.yLabel, { color: ui.mutedText }]}>
                  10k
                </ThemedText>
                <ThemedText style={[styles.yLabel, { color: ui.mutedText }]}>
                  0
                </ThemedText>
              </View>

              <View style={styles.chartArea}>
                <View
                  style={[
                    styles.chartGuide,
                    { borderColor: ui.border, top: "8%" },
                  ]}
                />
                <View
                  style={[
                    styles.chartGuide,
                    { borderColor: ui.border, top: "34%" },
                  ]}
                />
                <View
                  style={[
                    styles.chartGuide,
                    { borderColor: ui.border, top: "58%" },
                  ]}
                />
                <View
                  style={[
                    styles.chartGuide,
                    { borderColor: ui.border, top: "82%" },
                  ]}
                />
                <Image
                  source={{
                    uri: "https://api.builder.io/api/v1/image/assets/TEMP/94870884-619f-436a-b553-127d9ef92e88?placeholderIfAbsent=true&apiKey=342743ad2e264936acee3aea8d83ec5e",
                  }}
                  style={styles.chartImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.monthRow}>
              <ThemedText style={[styles.monthLabel, { color: ui.mutedText }]}>
                Jan
              </ThemedText>
              <ThemedText style={[styles.monthLabel, { color: ui.mutedText }]}>
                Feb
              </ThemedText>
              <ThemedText style={[styles.monthLabel, { color: ui.text }]}>
                Mar
              </ThemedText>
              <ThemedText style={[styles.monthLabel, { color: ui.mutedText }]}>
                Apr
              </ThemedText>
            </View>
          </View>

          <View style={styles.toolbarRow}>
            <Pressable
              onPress={() => setCreateModalOpen(true)}
              style={[
                styles.smallActionBtn,
                { borderColor: ui.border, backgroundColor: ui.surface2 },
              ]}
            >
              <Feather name="plus" size={18} color={ui.text} />
              <ThemedText style={[styles.actionText, { color: ui.text }]}>
                Add
              </ThemedText>
            </Pressable>

            <View
              style={[
                styles.viewPill,
                {
                  borderColor: ui.border,
                  backgroundColor: isDark ? "#2A2D33" : "#D8D8DA",
                },
              ]}
            >
              <Feather name="grid" size={18} color={ui.text} />
              <View
                style={[styles.viewDivider, { backgroundColor: ui.border }]}
              />
              <Feather name="list" size={18} color={ui.text} />
            </View>
          </View>

          <View
            style={[
              styles.searchWrap,
              { borderColor: ui.border, backgroundColor: ui.surface2 },
            ]}
          >
            <Feather name="search" size={18} color={ui.mutedText} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search"
              placeholderTextColor={ui.mutedText}
              style={[styles.searchInput, { color: ui.text }]}
            />
            <Pressable
              onPress={() => {}}
              style={[
                styles.searchFilter,
                { borderColor: ui.border, backgroundColor: ui.surface },
              ]}
              hitSlop={8}
            >
              <Feather name="sliders" size={16} color={ui.mutedText} />
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
              Your Accounts
            </ThemedText>
            <ThemedText
              style={[styles.sectionSubtitle, { color: ui.mutedText }]}
            >
              {filteredAccounts.length} total
            </ThemedText>
          </View>

          {filteredAccounts.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { borderColor: ui.border, backgroundColor: ui.surface2 },
              ]}
            >
              <ThemedText style={{ color: ui.text }}>
                {isLoading
                  ? "Loading..."
                  : "No accounts found. Tap + to add your first account."}
              </ThemedText>
            </View>
          ) : (
            filteredAccounts.map((item) => {
              const isCredit =
                (item.account_type ?? "").toLowerCase() === "credit";
              const cardColor = isDark
                ? isCredit
                  ? "#B24E4E"
                  : "#61202A"
                : isCredit
                  ? "#D86666"
                  : "#701D26";

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setEditingAccount(item)}
                  style={({ pressed }) => [
                    styles.accountCard,
                    {
                      backgroundColor: cardColor,
                      opacity: pressed ? 0.88 : 1,
                      borderColor: "rgba(255,255,255,0.28)",
                    },
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.cardGlow,
                      {
                        backgroundColor: isCredit
                          ? "rgba(255,255,255,0.26)"
                          : "rgba(255,255,255,0.18)",
                      },
                    ]}
                  />
                  <View pointerEvents="none" style={styles.cardRing} />
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTitleGroup}>
                      <ThemedText style={styles.cardTitle}>
                        {item.account_name ?? "Unnamed account"}
                      </ThemedText>
                      <View style={styles.cardTag}>
                        <ThemedText style={styles.cardTagText}>
                          {item.account_type
                            ? item.account_type.charAt(0).toUpperCase() +
                              item.account_type.slice(1)
                            : "Account"}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.cardIcon}>
                      <Feather
                        name={isCredit ? "credit-card" : "dollar-sign"}
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                  <ThemedText style={styles.cardBalance}>
                    {formatMoney(item.balance ?? 0)}
                  </ThemedText>
                  <View style={styles.cardMetaRow}>
                    <View style={styles.cardMetaPill}>
                      <Feather
                        name="calendar"
                        size={12}
                        color="rgba(255,255,255,0.9)"
                      />
                      <ThemedText style={styles.cardMetaText}>
                        {formatCardDate(item.payment_duedate)}
                      </ThemedText>
                    </View>
                    {item.currency ? (
                      <View style={styles.cardMetaPill}>
                        <Feather
                          name="globe"
                          size={12}
                          color="rgba(255,255,255,0.9)"
                        />
                        <ThemedText style={styles.cardMetaText}>
                          {item.currency}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText style={styles.cardSubText}>
                    Available: {formatMoney(calculateAvailable(item))}
                  </ThemedText>
                </Pressable>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      <Pressable
        onPress={() => setCreateModalOpen(true)}
        style={({ pressed }) => [
          styles.fabCenter,
          {
            backgroundColor: ui.surface2,
            opacity: pressed ? 0.8 : 1,
            bottom: fabBottom,
            borderColor: ui.border,
          },
        ]}
      >
        <Feather name="plus" size={34} color={ui.text} />
      </Pressable>

      <Modal
        visible={createModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <ThemedView
          style={{
            flex: 1,
            padding: 16,
            paddingTop: 16 + insets.top,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <ThemedText type="title">Add Account</ThemedText>
            <Pressable onPress={() => setCreateModalOpen(false)}>
              <ThemedText style={{ color: "#007AFF" }}>Cancel</ThemedText>
            </Pressable>
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
                  backgroundColor: ui.surface,
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
                  backgroundColor: ui.surface,
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
                  backgroundColor: ui.surface,
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
                  backgroundColor: ui.surface,
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
                  backgroundColor: ui.surface,
                  color: ui.text,
                },
              ]}
            />

            <ThemedText type="defaultSemiBold">Statement Due Date</ThemedText>
            <TextInput
              value={createStatementDate}
              onChangeText={setCreateStatementDate}
              placeholder="Day of month or YYYY-MM-DD"
              placeholderTextColor={ui.mutedText}
              style={[
                styles.input,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface,
                  color: ui.text,
                },
              ]}
            />

            <ThemedText type="defaultSemiBold">Payment Due Date</ThemedText>
            <TextInput
              value={createPaymentDate}
              onChangeText={setCreatePaymentDate}
              placeholder="Day of month or YYYY-MM-DD"
              placeholderTextColor={ui.mutedText}
              style={[
                styles.input,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface,
                  color: ui.text,
                },
              ]}
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
                onPress={() => {}}
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

      {/* Edit Account Modal */}
      <Modal
        visible={!!editingAccount}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingAccount(null)}
      >
        <ThemedView
          style={{
            flex: 1,
            padding: 16,
            paddingTop: 16 + insets.top,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <ThemedText type="title">Edit Account</ThemedText>
            <Pressable onPress={() => setEditingAccount(null)}>
              <ThemedText style={{ color: "#007AFF" }}>Cancel</ThemedText>
            </Pressable>
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
                    backgroundColor: ui.surface,
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
                    backgroundColor: ui.surface,
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
                    backgroundColor: ui.surface,
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
                    backgroundColor: ui.surface,
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
                    backgroundColor: ui.surface,
                    color: ui.text,
                  },
                ]}
              />
            </View>

            {/* Simple Text Inputs for Dates for now */}
            <View style={{ gap: 6 }}>
              <ThemedText type="defaultSemiBold">Statement Due Date</ThemedText>
              <TextInput
                value={editStatementDate}
                onChangeText={setEditStatementDate}
                placeholder="Day of month or YYYY-MM-DD"
                placeholderTextColor={ui.mutedText}
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    color: ui.text,
                  },
                ]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <ThemedText type="defaultSemiBold">Payment Due Date</ThemedText>
              <TextInput
                value={editPaymentDate}
                onChangeText={setEditPaymentDate}
                placeholder="Day of month or YYYY-MM-DD"
                placeholderTextColor={ui.mutedText}
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    color: ui.text,
                  },
                ]}
              />
            </View>

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
                  marginTop: 8,
                },
              ]}
            >
              <ThemedText
                type="defaultSemiBold"
                style={{ color: ui.surface }} // Invert text color
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
    </ThemedView>
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
  bgDecor: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.7,
  },
  bgOrbTop: {
    width: 260,
    height: 260,
    top: -140,
    right: -90,
  },
  bgOrbBottom: {
    width: 220,
    height: 220,
    bottom: -120,
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
  scrollContent: {
    gap: 14,
    paddingBottom: 16,
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
  sectionHeader: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-end",
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
    marginTop: 10,
  },
  accountCard: {
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: "hidden",
    gap: 8,
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
    fontSize: 30,
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
    marginTop: 4,
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalCancel: {
    opacity: 0.9,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
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
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteAction: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});



