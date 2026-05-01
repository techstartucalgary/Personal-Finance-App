import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import { AccountsTrendChart } from "@/components/accounts/AccountsTrendChart";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { NativeFab } from "@/components/ui/native-fab";
import { Tokens } from "@/constants/authTokens";
import { useTabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listAccounts } from "@/utils/accounts";
import { listExpenses } from "@/utils/expenses";
import { listGoals } from "@/utils/goals";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import { getPlaidAccounts, getPlaidTransactions } from "@/utils/plaid";

type AccountRow = {
  id: number | string;
  account_name: string | null;
  account_type: string | null;
  balance: number | null;
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
  account_id: number;
  amount: number | null;
  description?: string | null;
  transaction_date?: string | null;
};

export default function DashboardScreen() {
  const { session, isLoading: authLoading } = useAuthContext();
  const userId = session?.user.id;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Dynamic tab bar height (NativeTabs-safe)
  const tabBarHeight = insets.bottom + 48;
  const fabBottom = tabBarHeight + 2;
  const { ui } = useTabsTheme();
  const pageBackground = ui.bg;
  const cardBackground = ui.surface;
  const insetBackground = ui.surface2;
  const subtleBorder = ui.border;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<PlaidTransaction[]>([]);

  const loadData = useCallback(async (silent = false) => {
    if (!userId) return;

    // Improved loading UX: only show spinner if we have no data at all
    const hasData = accounts.length > 0 || plaidAccounts.length > 0 || goals.length > 0;
    if (!silent && !hasData) setIsLoading(true);

    try {
      const [
        accountsData,
        goalsData,
        pAccounts,
        expensesData,
        pTransactions
      ] = await Promise.all([
        listAccounts({ profile_id: userId }),
        listGoals({ profile_id: userId }),
        getPlaidAccounts(),
        listExpenses({ profile_id: userId }),
        getPlaidTransactions()
      ]);

      setAccounts((accountsData as AccountRow[]) ?? []);
      setGoals((goalsData as any[]) ?? []);
      setPlaidAccounts(pAccounts ?? []);
      setExpenses((expensesData as ExpenseRow[]) ?? []);
      setPlaidTransactions(pTransactions ?? []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, accounts.length, plaidAccounts.length, goals.length]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
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

    const anim = Animated.stagger(120, [hero, list]);
    anim.start();

    return () => anim.stop();
  }, [heroAnim, listAnim]);

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

  const recentActivity = useMemo(() => {
    type UnifiedTx = {
      id: string;
      title: string;
      amount: number;
      date: string; // YYYY-MM-DD
      isPlaid: boolean;
    };
    const unified: UnifiedTx[] = [];

    expenses.forEach((ex) => {
      unified.push({
        id: ex.id,
        title: ex.description || "Manual Expense",
        amount: ex.amount || 0, // In expenses, positive amount represents an expense
        date: ex.transaction_date || "2000-01-01",
        isPlaid: false,
      });
    });

    plaidTransactions.forEach((pt) => {
      unified.push({
        id: pt.transaction_id,
        title: pt.name || "Bank Transaction",
        amount: pt.amount, // Positive amount is an outflow/expense in plaid usually
        date: pt.date || "2000-01-01",
        isPlaid: true,
      });
    });

    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return unified.slice(0, 5); // Return top 5
  }, [expenses, plaidTransactions]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const localD = new Date(d.getTime() + userTimezoneOffset);
    return localD.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (authLoading && !session) {
    return (
      <ThemedView style={[styles.container, { paddingTop: 16 + insets.top }]}>
        <ActivityIndicator color={ui.text} />
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedView style={[styles.container, { paddingTop: 16 + insets.top }]}>
        <ThemedText type="title" style={{ color: ui.text }}>
          Dashboard
        </ThemedText>
        <ThemedText style={{ color: ui.mutedText }}>
          Please sign in to view your dashboard.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <>

      <ScrollView
        style={[styles.container, { backgroundColor: pageBackground }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 120, paddingTop: Platform.OS === "android" ? 16 : 0 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadData(false)}
            tintColor={ui.text}
          />
        }
      >

        <Animated.View style={heroAnimatedStyle}>
          <View
            style={[
              styles.heroCard,
              { borderColor: subtleBorder, backgroundColor: cardBackground },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View>
                <ThemedText style={[styles.heroLabel, { color: ui.mutedText }]}>
                  Total Balance
                </ThemedText>
                <ThemedText type="heroNumber" style={[styles.heroValue, { color: ui.text }]}>
                  {formatMoney(totalBalance)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.heroBadge,
                  { borderColor: subtleBorder, backgroundColor: insetBackground },
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
                  { borderColor: subtleBorder, backgroundColor: insetBackground },
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
                  { borderColor: subtleBorder, backgroundColor: insetBackground },
                ]}
              >
                <ThemedText style={[styles.statLabel, { color: ui.mutedText }]}>
                  Accounts
                </ThemedText>
                <ThemedText style={[styles.statValue, { color: ui.text }]}>
                  {accounts.length + plaidAccounts.length}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statPill,
                  { borderColor: subtleBorder, backgroundColor: insetBackground },
                ]}
              >
                <ThemedText style={[styles.statLabel, { color: ui.mutedText }]}>
                  Assets / Liabilities
                </ThemedText>
                <ThemedText
                  style={[styles.statValueSmall, { color: ui.text }]}
                >
                  {assetsCount} / {liabilitiesCount}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={listAnimatedStyle}>
          <View
            style={[
              styles.chartCard,
              { borderColor: subtleBorder, backgroundColor: cardBackground },
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
                  Last 5 months
                </ThemedText>
              </View>
              <View
                style={[
                  styles.chartChip,
                  { borderColor: subtleBorder, backgroundColor: insetBackground },
                ]}
              >
                <Feather name="bar-chart-2" size={14} color={ui.accent} />
                <ThemedText style={[styles.chartChipText, { color: ui.text }]}>
                  Insights
                </ThemedText>
              </View>
            </View>
            <AccountsTrendChart
              accounts={[
                ...accounts.map(a => ({
                  id: a.id,
                  account_name: a.account_name,
                  account_type: a.account_type,
                  balance: a.balance,
                })),
                ...plaidAccounts.map(pa => ({
                  id: pa.account_id,
                  account_name: pa.name,
                  account_type: pa.type,
                  balance: pa.balances.current,
                })),
              ]}
              transactions={[
                ...expenses.map(ex => ({
                  account_id: ex.account_id,
                  amount: ex.amount,
                  transaction_date: ex.transaction_date,
                })),
                ...plaidTransactions.map(pt => ({
                  account_id: pt.account_id as any,
                  amount: pt.amount,
                  transaction_date: pt.date,
                })),
              ]}
              textColor={ui.text}
              mutedTextColor={ui.mutedText}
              gridColor={ui.border}
            />
          </View>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={{ color: ui.text }}>
            Recent Activity
          </ThemedText>
          <Pressable onPress={() => router.push("/(tabs)/transactions")}>
            <ThemedText style={{ color: ui.accent }}>View All</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, { borderColor: subtleBorder, backgroundColor: cardBackground }]}>
          {recentActivity.length > 0 ? (
            recentActivity.map((tx) => {
              const isNegative = tx.amount > 0;
              return (
                <View key={tx.id} style={[styles.txRow, { borderBottomColor: ui.border }]}>
                  <View style={styles.txLeft}>
                    <ThemedText style={[styles.txName, { color: ui.text }]} numberOfLines={1}>
                      {tx.title}
                    </ThemedText>
                    <ThemedText style={[styles.txDate, { color: ui.mutedText }]}>
                      {formatDateShort(tx.date)} {tx.isPlaid && "• Bank"}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[styles.txAmount, { color: isNegative ? ui.negative : ui.positive }]}
                  >
                    {isNegative ? "-" : "+"}{formatMoney(Math.abs(tx.amount))}
                  </ThemedText>
                </View>
              );
            })
          ) : (
            <ThemedText style={{ color: ui.mutedText, textAlign: "center", paddingVertical: 16 }}>
              No recent activity
            </ThemedText>
          )}
        </View>
      </ScrollView>

      <NativeFab
        accessibilityLabel="Open AI Chatbot"
        androidIconSource={require("../../../assets/icons/chat.xml")}
        bottom={fabBottom}
        fallbackFeatherName="message-square"
        iosSystemName="message"
        inverted
        onPress={() => router.push("/chat-ai")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 24,
  },
  header: {
    marginBottom: 8,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 12,

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
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
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
    borderRadius: 12,
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
    borderRadius: 24,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: -8,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txLeft: {
    flex: 1,
    marginRight: 16,
  },
  txName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  txDate: {
    fontSize: 13,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
});
