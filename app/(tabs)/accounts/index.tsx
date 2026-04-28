import React, { useCallback, useMemo, useState } from "react";
import {
  Animated,
  InteractionManager,
  Platform,
  RefreshControl,
  ScrollView,
  useColorScheme
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Stack, useFocusEffect, useRouter } from "expo-router";

import { useTabTransition } from "@/components/ui/useTabTransition";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { listGoals } from "@/utils/goals";
import {
  getPlaidAccounts
} from "@/utils/plaid";
import { supabase } from "@/utils/supabase";

import { AccountsAllView } from "@/components/accounts/tab/AccountsAllView";
import { AccountsFab } from "@/components/accounts/tab/AccountsFab";
import {
  AccountsLoadingState,
  AccountsSignedOutState,
} from "@/components/accounts/tab/AccountsState";
import { styles } from "@/components/accounts/tab/styles";
import type { AccountRow, GoalRow } from "@/components/accounts/tab/types";
import type { PlaidAccount } from "@/utils/plaid";

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();
  const router = useRouter();

  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  // Dynamic tab bar height (NativeTabs-safe)
  const tabBarHeight = insets.bottom + 48;
  const fabBottom = tabBarHeight + 2;
  const ui = useThemeUI();
  const transition = useTabTransition();

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

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
      hideWhenScrolling: true,
      tintColor: ui.accent,
      textColor: ui.text,
      hintTextColor: ui.mutedText,
      headerIconColor: ui.mutedText,
    }),
    [setSearchQuery, ui.accent, ui.mutedText, ui.text],
  );

  // Primary loader for manual accounts, goals, and Plaid summaries.
  const loadAccounts = useCallback(
    async (silent = false) => {
      if (!userId) {
        setAccounts([]);
        setGoals([]);
        setPlaidAccounts([]);
        return;
      }

      const hasData =
        accounts.length > 0 || goals.length > 0 || plaidAccounts.length > 0;
      if (!silent && !hasData) setIsLoading(true);

      try {
        const plaidRequest = getPlaidAccounts()
          .then((pAccounts) => {
            setPlaidAccounts(pAccounts ?? []);
          })
          .catch((err) => {
            console.error("Error loading Plaid accounts:", err);
            setPlaidAccounts([]);
          });

        const [accountsResponse, goalsData] = await Promise.all([
          supabase
            .from("account")
            .select(
              "id, profile_id, created_at, account_name, account_type, balance, credit_limit, statement_duedate, payment_duedate, interest_rate, currency",
            )
            .eq("profile_id", userId)
            .order("created_at", { ascending: false }),
          listGoals({ profile_id: userId }),
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
        setIsLoading(false);

        await plaidRequest;
      } catch (err) {
        console.error("Error loading accounts data:", err);
        setIsLoading(false);
      }
    },
    [userId, accounts.length, goals.length, plaidAccounts.length],
  );

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        loadAccounts(true);
      });
      return () => task.cancel();
    }, [loadAccounts]),
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
      const institutionPart = pa.institution_name?.toLowerCase() ?? "";
      return (
        namePart.includes(q) ||
        typePart.includes(q) ||
        subtypePart.includes(q) ||
        institutionPart.includes(q)
      );
    });
  }, [plaidAccounts, searchQuery]);



  const openSingleAccount = useCallback(
    (id: string) => {
      router.push(`/account/${id}`);
    },
    [router],
  );

  if (authLoading && !session) {
    return <AccountsLoadingState ui={ui} insets={insets} />;
  }

  if (!session) {
    return <AccountsSignedOutState ui={ui} insets={insets} />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions,
          headerLargeTitle: Platform.OS === "ios",
        }}
      />
      <ScrollView
        style={[styles.screen, { backgroundColor: ui.bg }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: 16,
            paddingBottom: tabBarHeight + 120,
            paddingTop: Platform.OS === "android" ? 16 : 0,
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
        <Animated.View
          style={transition.style}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
          <AccountsAllView
            ui={ui}
            isLoading={isLoading}
            filteredManualAccounts={filteredManualAccounts}
            filteredPlaidAccounts={filteredPlaidAccounts}
            searchQuery={searchQuery}
            manualCount={accounts.length}
            formatMoney={formatMoney}
            getAccountColor={getAccountColor}
            onOpenSingleAccount={openSingleAccount}
          />
        </Animated.View>
      </ScrollView>

      <AccountsFab
        ui={ui}
        fabBottom={fabBottom}
        onPress={() => router.push("/add-account-source")}
      />
    </>
  );
}
