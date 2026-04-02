import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  InteractionManager,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";
import type { LinkExit, LinkSuccess } from "react-native-plaid-link-sdk";
import {
  create as plaidCreate,
  destroy as plaidDestroy,
  open as plaidOpen,
} from "react-native-plaid-link-sdk";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Stack, useFocusEffect, useRouter } from "expo-router";

import { useTabTransition } from "@/components/ui/useTabTransition";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  createAccount as createAccountApi,
} from "@/utils/accounts";
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

import { AccountsAddSourceModal } from "@/components/accounts/tab/AccountsAddSourceModal";
import { AccountsAllView } from "@/components/accounts/tab/AccountsAllView";
import { AccountsCreateModal } from "@/components/accounts/tab/AccountsCreateModal";
import { AccountsFab } from "@/components/accounts/tab/AccountsFab";
import {
  AccountsLoadingState,
  AccountsSignedOutState,
} from "@/components/accounts/tab/AccountsState";
import { styles } from "@/components/accounts/tab/styles";
import type { AccountRow, AccountType, GoalRow } from "@/components/accounts/tab/types";

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();
  const router = useRouter();

  const insets = useSafeAreaInsets();

  // Dynamic tab bar height (NativeTabs-safe)
  const tabBarHeight = insets.bottom + 60;
  const fabBottom = tabBarHeight - 16;
  const ui = useThemeUI();
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

  const [searchQuery, setSearchQuery] = useState("");
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);

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
            paddingTop: 16,
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
            manualCount={accounts.length}
            formatMoney={formatMoney}
            getAccountColor={getAccountColor}
            onOpenAddSource={() => setAddSourceModalOpen(true)}
            onOpenSingleAccount={openSingleAccount}
          />
        </Animated.View>
      </ScrollView>

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
    </>
  );
}
