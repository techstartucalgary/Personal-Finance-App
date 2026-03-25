import Feather from "@expo/vector-icons/Feather";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme
} from "react-native";
import { useTheme } from "react-native-paper";
import type { LinkExit, LinkSuccess } from "react-native-plaid-link-sdk";
import { create as plaidCreate, destroy as plaidDestroy, open as plaidOpen } from "react-native-plaid-link-sdk";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFocusEffect, useNavigation, useRouter } from "expo-router";

import { AccountCardCarousel, type UnifiedAccount } from "@/components/accounts/AccountCardCarousel";
import { AddAccountModal } from "@/components/AddAccountModal";
import { EditAccountModal } from "@/components/EditAccountModal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listGoals } from "@/utils/goals";
import { formatMoney } from "@/utils/money";
import type { PlaidAccount } from "@/utils/plaid";
import { exchangePublicToken, getLinkToken, getPlaidAccounts, removePlaidItem } from "@/utils/plaid";
import { supabase } from "@/utils/supabase";



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

// ── Color palettes ─────────────────────────────────
// Asset/Debit/Checking: Professional deep tones (Blues, Greens, Purples)
const DEBIT_PALETTE = [
  "#1A365D", // Deep Navy
  "#064E3B", // Forest Emerald
  "#4C1D95", // Royal Purple
  "#134E4A", // Dark Teal
  "#1E3A8A", // Cobalt Blue
  "#312E81", // Deep Indigo
];

// Credit/Liability/Loan: Warm and active tones (Rose, Amber, Gold, Mauve)
const CREDIT_PALETTE = [
  "#7F1D1D", // Deep Carmine
  "#78350F", // Amber Clay
  "#831843", // Deep Rose
  "#7C2D12", // Burnt Terra
  "#581C87", // Dark Violet
  "#0F172A", // Midnight Slate
];

function getAccountColor(isLiability: boolean, index: number) {
  const palette = isLiability ? CREDIT_PALETTE : DEBIT_PALETTE;
  return palette[index % palette.length];
}



// ── Detail Animation Wrapper ───────────────────────
const FadeInView = ({
  children,
  trigger,
  direction,
}: {
  children: React.ReactNode;
  trigger: any;
  direction: "left" | "right";
}) => {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const translateX = useRef(
    new Animated.Value(direction === "right" ? 16 : -16)
  ).current;

  useEffect(() => {
    // Reset values for the new entrance
    opacity.setValue(0.5);
    translateX.setValue(direction === "right" ? 16 : -16);

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        stiffness: 200,
        damping: 50,
        mass: 1,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => animation.stop();
  }, [trigger, direction]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
};

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
  const prevIndexRef = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Create form state ──────────────────────────────

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);

  // ── Edit modal state ──────────────────────────────

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<UnifiedAccount | null>(null);

  // ── Plaid state ────────────────────────────────────

  const [isConnecting, setIsConnecting] = useState(false);


  // ── Header search ──────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: "Search accounts...",
          onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
          hideWhenScrolling: false,
          tintColor: ui.accent,
          textColor: ui.text,
          hintTextColor: ui.mutedText,
          headerIconColor: ui.mutedText,
          placement: "integratedButton",
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

  const handleConnectBank = useCallback(async (options?: { onBeforeOpen?: () => void; onError?: () => void; onFinished?: () => void }) => {
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
              options?.onFinished?.();
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
              options?.onFinished?.();
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



  // ── Build unified account list ─────────────────────

  const unifiedAccounts: UnifiedAccount[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list: UnifiedAccount[] = [];
    let colorIdx = 0;

    // Manual accounts
    accounts.forEach((acc) => {
      const typeStr = acc.account_type?.toLowerCase() ?? "";
      const isLiability = typeStr === "credit";
      const currentColor = getAccountColor(isLiability, colorIdx);
      colorIdx++;

      const nameStr = acc.account_name?.toLowerCase() ?? "";
      if (q && !nameStr.includes(q) && !typeStr.includes(q)) return;

      // Calculate available balance for manual account
      const accountGoals = goals.filter((g) =>
        g.linked_account != null && String(g.linked_account) === String(acc.id)
      );
      const allocated = accountGoals.reduce((sum, g) => sum + (g.current_amount ?? 0), 0);
      let available = (acc.balance ?? 0) - allocated;
      if (isLiability) {
        available = (acc.credit_limit ?? 0) - (acc.balance ?? 0);
      }

      list.push({
        key: `manual-${acc.id}`,
        kind: "manual",
        color: currentColor,
        name: acc.account_name ?? "Unnamed Account",
        balance: formatMoney(acc.balance ?? 0),
        availableBalance: formatMoney(available),
        typeLabel: acc.account_type ? acc.account_type.charAt(0).toUpperCase() + acc.account_type.slice(1) : "Account",
        subtitle: acc.currency ?? "CAD",
        sourceLabel: "Manual",
        data: acc,
      });
    });

    // Plaid accounts
    plaidAccounts.forEach((pa) => {
      const typeStr = pa.type?.toLowerCase() ?? "";
      const isLiability = typeStr === "credit" || typeStr === "loan";
      const currentColor = getAccountColor(isLiability, colorIdx);
      colorIdx++;

      const nameStr = pa.name?.toLowerCase() ?? "";
      if (q && !nameStr.includes(q) && !typeStr.includes(q)) return;

      // Calculate available balance for Plaid account
      const accountGoals = goals.filter((g) => g.linked_plaid_account === pa.account_id);
      const allocated = accountGoals.reduce((sum, g) => sum + (g.current_amount ?? 0), 0);
      const available = (pa.balances.current ?? 0) - allocated;

      list.push({
        key: `plaid-${pa.account_id}`,
        kind: "plaid",
        color: currentColor,
        name: pa.name,
        balance: formatMoney(pa.balances.current ?? 0),
        availableBalance: formatMoney(pa.balances.available ?? available),
        typeLabel: pa.type.charAt(0).toUpperCase() + pa.type.slice(1),
        subtitle: pa.subtype ? pa.subtype.charAt(0).toUpperCase() + pa.subtype.slice(1) : "Bank",
        sourceLabel: "Plaid",
        institutionName: pa.institution_name,
        mask: pa.mask,
        data: pa,
      });
    });


    return list;
  }, [accounts, plaidAccounts, searchQuery]);

  // ── Active account derived state ───────────────────

  const activeItem = unifiedAccounts[activeCardIndex] ?? null;
  const direction = activeCardIndex >= prevIndexRef.current ? "right" : "left";

  useEffect(() => {
    prevIndexRef.current = activeCardIndex;
  }, [activeCardIndex]);

  const activeManualAccount: AccountRow | null =
    activeItem?.kind === "manual" ? activeItem.data : null;
  const activePlaidAccount: PlaidAccount | null =
    activeItem?.kind === "plaid" ? activeItem.data : null;


  // ── Plaid helpers ──────────────────────────────────

  const plaidAvailable = useMemo(() => {
    if (!activePlaidAccount) return null;
    const totalBalance = activePlaidAccount.balances.current ?? 0;
    const accountGoals = goals.filter((g) => g.linked_plaid_account === activePlaidAccount.account_id);
    const allocated = accountGoals.reduce((sum, g) => sum + (g.current_amount ?? 0), 0);
    return totalBalance - allocated;
  }, [activePlaidAccount, goals]);

  const manualAvailable = useMemo(() => {
    if (!activeManualAccount) return null;
    const totalBalance = activeManualAccount.balance ?? 0;
    const accountGoals = goals.filter((g) =>
      g.linked_account != null && String(g.linked_account) === String(activeManualAccount.id)
    );
    const allocated = accountGoals.reduce((sum, g) => sum + (g.current_amount ?? 0), 0);

    if (activeManualAccount.account_type === "credit") {
      const limit = activeManualAccount.credit_limit ?? 0;
      return limit - totalBalance;
    }

    return totalBalance - allocated;
  }, [activeManualAccount, goals]);



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
          {
            paddingBottom: tabBarHeight + 120,
            paddingTop: Platform.OS === "android" ? 24 : 0
          },
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
        {unifiedAccounts.length > 0 && (
          <AccountCardCarousel
            accounts={unifiedAccounts}
            activeIndex={activeCardIndex}
            onIndexChange={setActiveCardIndex}
            onAddPress={() => setAddSourceModalOpen(true)}
            onAccountPress={(acc) => {
              setSelectedAccountForEdit(acc);
              setEditModalOpen(true);
            }}
            ui={ui}
          />
        )}

        {/* ── Manual Detail Section (Read Only) ─────── */}
        {activeManualAccount && (
          <FadeInView trigger={activeManualAccount.id} direction={direction}>
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <View style={styles.sectionHeader}>
                <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>ACCOUNT DETAILS</ThemedText>
              </View>

              <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
                {/* Name */}
                <View style={styles.inputRow}>
                  <IconSymbol name="signature" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Name</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>{activeManualAccount.account_name}</ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

                {/* Balance */}
                <View style={styles.inputRow}>
                  <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Current Balance</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text, fontSize: 18 }]}>
                    {formatMoney(activeManualAccount.balance ?? 0)}
                  </ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

                {/* Available */}
                <View style={styles.inputRow}>
                  <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Available</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.accent, fontSize: 18 }]}>
                    {formatMoney(manualAvailable ?? 0)}
                  </ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

                {/* Credit Limit */}
                <View style={styles.inputRow}>
                  <IconSymbol name="creditcard" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Credit Limit</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>
                    {formatMoney(activeManualAccount.credit_limit ?? 0)}
                  </ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

                {/* Interest Rate */}
                <View style={styles.inputRow}>
                  <IconSymbol name="percent" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Interest Rate</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>
                    {activeManualAccount.interest_rate}%
                  </ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

                {/* Currency */}
                <View style={styles.inputRow}>
                  <IconSymbol name="globe" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Currency</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>
                    {activeManualAccount.currency ?? "CAD"}
                  </ThemedText>
                </View>
              </View>

              {/* Dates section */}
              <View style={styles.sectionHeader}>
                <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>DUE DATES</ThemedText>
              </View>

              <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
                <View style={styles.inputRow}>
                  <IconSymbol name="calendar" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Statement Due</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>{activeManualAccount.statement_duedate || "N/A"}</ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                <View style={styles.inputRow}>
                  <IconSymbol name="calendar.badge.clock" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Payment Due</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>{activeManualAccount.payment_duedate || "N/A"}</ThemedText>
                </View>
              </View>
            </View>
          </FadeInView>
        )}

        {/* ── Plaid Account Detail (Read Only) ───────── */}
        {activePlaidAccount && (
          <FadeInView trigger={activePlaidAccount.account_id} direction={direction}>
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <View style={styles.sectionHeader}>
                <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>ACCOUNT DETAILS</ThemedText>
              </View>

              <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
                <View style={styles.inputRow}>
                  <IconSymbol name="signature" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Name</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>{activePlaidAccount.name}</ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

                <View style={styles.inputRow}>
                  <IconSymbol name="creditcard" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Type</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>
                    {activePlaidAccount.type.charAt(0).toUpperCase() + activePlaidAccount.type.slice(1)}
                    {activePlaidAccount.subtype ? ` · ${activePlaidAccount.subtype.charAt(0).toUpperCase() + activePlaidAccount.subtype.slice(1)}` : ""}
                  </ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

                <View style={styles.inputRow}>
                  <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Current Balance</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text, fontSize: 18 }]}>
                    {formatMoney(activePlaidAccount.balances.current ?? 0)}
                  </ThemedText>
                </View>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

                <View style={styles.inputRow}>
                  <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
                  <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Available</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.accent, fontSize: 18 }]}>
                    {formatMoney(plaidAvailable ?? activePlaidAccount.balances.available ?? 0)}
                  </ThemedText>
                </View>

                {activePlaidAccount.mask && (
                  <>
                    <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                    <View style={styles.inputRow}>
                      <IconSymbol name="lock" size={20} color={ui.mutedText} />
                      <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Account Mask</ThemedText>
                      <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>•••• {activePlaidAccount.mask}</ThemedText>
                    </View>
                  </>
                )}

                {activePlaidAccount.institution_name && (
                  <>
                    <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                    <View style={styles.inputRow}>
                      <IconSymbol name="building.2" size={20} color={ui.mutedText} />
                      <ThemedText style={[styles.rowLabel, { color: ui.mutedText }]}>Institution</ThemedText>
                      <ThemedText type="defaultSemiBold" style={[styles.rowValue, { color: ui.text }]}>{activePlaidAccount.institution_name}</ThemedText>
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
          </FadeInView>
        )}

        {/* Empty state when no accounts */}
        {accounts.length === 0 && plaidAccounts.length === 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 40, alignItems: "center", gap: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: ui.surface2, alignItems: "center", justifyContent: "center" }}>
              <Feather name="credit-card" size={32} color={ui.mutedText} />
            </View>
            <ThemedText style={{ color: ui.text, textAlign: "center", fontSize: 18, fontWeight: "600" }}>
              No Accounts Yet
            </ThemedText>
            <ThemedText style={{ color: ui.mutedText, textAlign: "center", paddingHorizontal: 20 }}>
              Add your first account to start tracking your balances and transactions.
            </ThemedText>

            <Pressable
              onPress={() => setAddSourceModalOpen(true)}
              style={({ pressed }) => [
                styles.createButton,
                {
                  backgroundColor: ui.text,
                  marginTop: 16,
                  opacity: pressed ? 0.8 : 1,
                  paddingHorizontal: 32,
                  width: 'auto',
                },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
                Add First Account
              </ThemedText>
            </Pressable>
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
        <ThemedText style={{ color: ui.mutedText, marginBottom: 16, textAlign: "center", fontSize: 15 }}>
          How would you like to add your new account?
        </ThemedText>

        <View style={{ gap: 12 }}>
          <Pressable
            style={({ pressed }) => [
              styles.modalOption,
              {
                borderColor: ui.border,
                backgroundColor: ui.surface2,
                opacity: pressed ? 0.7 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                padding: 16,
              },
            ]}
            onPress={() => {
              setAddSourceModalOpen(false);
              setCreateModalOpen(true);
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ui.surface, alignItems: "center", justifyContent: "center" }}>
              <Feather name="edit-2" size={20} color={ui.text} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Manual Account</ThemedText>
              <ThemedText style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}>Enter transactions yourself</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={ui.mutedText} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.modalOption,
              {
                borderColor: ui.border,
                backgroundColor: ui.surface2,
                opacity: pressed ? 0.7 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                padding: 16,
              },
            ]}
            disabled={isConnecting}
            onPress={() => {
              handleConnectBank({
                onBeforeOpen: () => {
                  if (Platform.OS === 'android') {
                    setAddSourceModalOpen(false);
                  }
                },
                onFinished: () => {
                  if (Platform.OS === 'ios') {
                    setAddSourceModalOpen(false);
                  }
                },
                onError: () => setAddSourceModalOpen(false),
              });
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ui.accentSoft, alignItems: "center", justifyContent: "center" }}>
              {isConnecting ? (
                <ActivityIndicator size="small" color={ui.accent} />
              ) : (
                <Feather name="link" size={20} color={ui.accent} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{isConnecting ? "Connecting..." : "Connect Bank"}</ThemedText>
              <ThemedText style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}>Sync automatically via Plaid</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={ui.mutedText} />
          </Pressable>
        </View>
      </SelectionModal>

      {/* ── Create Account Modal ─────────────────────── */}
      <AddAccountModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAccountCreated={loadAccounts}
        ui={ui}
        isDark={isDark}
        userId={userId}
      />

      {/* ── Edit Account Modal ─────────────────────── */}
      <EditAccountModal
        visible={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedAccountForEdit(null);
        }}
        account={selectedAccountForEdit}
        onAccountUpdated={loadAccounts}
        onAccountDeleted={async () => {
          setActiveCardIndex(0);
          await loadAccounts();
        }}
        ui={ui}
        isDark={isDark}
        userId={userId}
      />
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
    paddingVertical: 18,
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
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
