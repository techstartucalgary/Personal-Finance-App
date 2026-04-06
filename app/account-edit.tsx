import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountsEditForm } from "@/components/accounts/tab/AccountsEditModal";
import { ThemedText } from "@/components/themed-text";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import {
  deleteAccount as deleteAccountApi,
  updateAccount as updateAccountApi,
} from "@/utils/accounts";
import { getPlaidAccounts, removePlaidItem, type PlaidAccount } from "@/utils/plaid";
import { supabase } from "@/utils/supabase";

type AccountRow = {
  id: string;
  account_name: string | null;
  balance: number | null;
  credit_limit?: number | null;
  interest_rate?: number | null;
  statement_duedate?: string | null;
  payment_duedate?: string | null;
  currency?: string | null;
};

type Ui = ReturnType<typeof useThemeUI>;

export default function AccountEditScreen() {
  const { editId, kind, plaidAccountId, initialPlaidAccount: initialPlaidAccountParam } = useLocalSearchParams<{
    editId?: string;
    kind?: "manual" | "plaid";
    plaidAccountId?: string;
    initialPlaidAccount?: string;
  }>();
  const router = useRouter();
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const ui = useThemeUI();
  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E";
  const userId = session?.user.id;

  const initialPlaidAccount = useMemo(() => {
    if (!kind || kind !== "plaid") return null;
    const raw = Array.isArray(initialPlaidAccountParam)
      ? initialPlaidAccountParam[0]
      : initialPlaidAccountParam;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PlaidAccount;
    } catch {
      return null;
    }
  }, [kind, initialPlaidAccountParam]);

  const [isLoading, setIsLoading] = useState(false);
  const [account, setAccount] = useState<AccountRow | null>(null);
  const [plaidAccount, setPlaidAccount] = useState<PlaidAccount | null>(initialPlaidAccount);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editInterest, setEditInterest] = useState("");
  const [editStatementDate, setEditStatementDate] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editCurrency, setEditCurrency] = useState("CAD");

  const loadAccount = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      if (kind === "plaid" && plaidAccountId) {
        const accounts = await getPlaidAccounts();
        const next = accounts.find((item) => item.account_id === plaidAccountId) ?? null;
        if (!next) {
          throw new Error("Plaid account not found");
        }
        setPlaidAccount(next);
        setAccount(null);
        return;
      }

      if (!editId) return;
      const { data, error } = await supabase
        .from("account")
        .select("id, account_name, balance, credit_limit, interest_rate, statement_duedate, payment_duedate, currency")
        .eq("profile_id", userId)
        .eq("id", editId)
        .single();

      if (error || !data) {
        throw error ?? new Error("Account not found");
      }

      const next = data as AccountRow;
      setAccount(next);
      setPlaidAccount(null);
      setEditName(next.account_name ?? "");
      setEditBalance(next.balance?.toString() ?? "");
      setEditLimit(next.credit_limit?.toString() ?? "");
      setEditInterest(next.interest_rate?.toString() ?? "");
      setEditStatementDate(next.statement_duedate ?? "");
      setEditPaymentDate(next.payment_duedate ?? "");
      setEditCurrency(next.currency ?? "CAD");
    } catch (error) {
      console.error("Error loading account", error);
      Alert.alert("Error", "Could not load account.");
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [editId, kind, plaidAccountId, router, userId]);

  useFocusEffect(
    useCallback(() => {
      loadAccount();
    }, [loadAccount]),
  );

  const updateAccount = useCallback(async () => {
    if (!userId || !account || kind === "plaid") return;
    setIsLoading(true);

    const cleanText = (val: string, fallback?: string | null) =>
      val.trim().length > 0 ? val.trim() : fallback ?? undefined;
    const cleanNumber = (val: string, fallback?: number | null) => {
      const trimmed = val.trim();
      if (!trimmed.length) return fallback ?? 0;
      const parsed = parseFloat(trimmed);
      return Number.isFinite(parsed) ? parsed : fallback ?? 0;
    };

    try {
      await updateAccountApi({
        id: account.id,
        profile_id: userId,
        update: {
          account_name: cleanText(editName, account.account_name),
          balance: cleanNumber(editBalance, account.balance),
          credit_limit: cleanNumber(editLimit, account.credit_limit),
          interest_rate: cleanNumber(editInterest, account.interest_rate),
          statement_duedate: cleanText(editStatementDate, account.statement_duedate),
          payment_duedate: cleanText(editPaymentDate, account.payment_duedate),
          currency: cleanText(editCurrency, account.currency),
        },
      });
      router.back();
    } catch (error) {
      console.error("Error updating account", error);
      Alert.alert("Error", "Could not update account.");
    } finally {
      setIsLoading(false);
    }
  }, [
    account,
    editBalance,
    editCurrency,
    editInterest,
    editLimit,
    editName,
    editPaymentDate,
    editStatementDate,
    kind,
    router,
    userId,
  ]);

  const deleteAccount = useCallback(async () => {
    if (!userId || !account || kind === "plaid") return;
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          try {
            await deleteAccountApi({ id: account.id, profile_id: userId });
            router.replace("/(tabs)/accounts");
          } catch (error) {
            console.error("Error deleting account", error);
            Alert.alert("Error", "Could not delete account.");
            setIsLoading(false);
          }
        },
      },
    ]);
  }, [account, kind, router, userId]);

  const unlinkPlaidAccount = useCallback(async () => {
    if (!plaidAccount) return;
    Alert.alert("Unlink", "Are you sure you want to unlink this account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlink",
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          try {
            await removePlaidItem(plaidAccount.plaid_item_id);
            router.replace("/(tabs)/accounts");
          } catch (error) {
            console.error("Error unlinking account", error);
            Alert.alert("Error", "Could not unlink account.");
            setIsLoading(false);
          }
        },
      },
    ]);
  }, [plaidAccount, router]);

  const formatMoney = useCallback((value: number | null | undefined) => {
    if (value == null) return "N/A";
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(Math.abs(value));
  }, []);

  const pageBackground = isDark ? ui.surface : ui.surface2;
  const cardBackground = isDark ? ui.surface2 : ui.surface;

  return (
    <>
      <Stack.Screen
        options={{
          title: kind === "plaid" ? "Manage Account" : "Edit Account",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      {kind === "plaid" ? (
        <View style={{ flex: 1, backgroundColor: pageBackground }}>
          <View
            style={{
              flex: 1,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: insets.bottom + 40,
              gap: 12,
            }}
          >
            {plaidAccount ? (
              <>
                <View style={styles.heroSection}>
                  <ThemedText style={[styles.amount, { color: ui.text }]}>
                    {formatMoney(plaidAccount.balances.current)}
                  </ThemedText>
                  <ThemedText style={[styles.accountName, { color: ui.text }]}>
                    {plaidAccount.name}
                  </ThemedText>
                  <View style={[styles.typeBadge, { backgroundColor: `${ui.accent}25` }]}>
                    <ThemedText style={[styles.typeText, { color: ui.accent }]}>
                      {plaidAccount.subtype ?? plaidAccount.type}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.sectionHeader}>
                  <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>
                    LINKED ACCOUNT
                  </ThemedText>
                </View>

                <View style={[styles.groupCard, { backgroundColor: cardBackground, borderColor: ui.border }]}>
                  <DetailRow label="Institution" value={plaidAccount.institution_name ?? "Plaid Bank"} ui={ui} />
                  <DetailRow label="Account Number" value={plaidAccount.mask ? `•••• ${plaidAccount.mask}` : "N/A"} ui={ui} />
                  <DetailRow label="Currency" value={plaidAccount.balances.iso_currency_code ?? "N/A"} ui={ui} />
                  <DetailRow label="Credit Limit" value={formatMoney(plaidAccount.balances.limit)} ui={ui} />
                  <DetailRow label="Editable" value="No, linked via Plaid" ui={ui} isLast />
                </View>

                <View style={styles.sectionHeader}>
                  <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>
                    ACTIONS
                  </ThemedText>
                </View>

                <View style={[styles.groupCard, { backgroundColor: cardBackground, borderColor: ui.border }]}>
                  <View style={styles.readOnlyRow}>
                    <ThemedText style={[styles.readOnlyText, { color: ui.mutedText }]}>
                      Plaid accounts can&apos;t be edited here. You can unlink the connection instead.
                    </ThemedText>
                  </View>
                </View>

                <Pressable
                  onPress={unlinkPlaidAccount}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    {
                      borderColor: ui.border,
                      backgroundColor: cardBackground,
                      marginTop: 12,
                      opacity: pressed ? 0.7 : 1,
                    },
                    isLoading && styles.buttonDisabled,
                  ]}
                >
                  <ThemedText type="defaultSemiBold" style={{ color: ui.danger }}>
                    Unlink Plaid Account
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <View style={[styles.groupCard, { backgroundColor: cardBackground, borderColor: ui.border }]}>
                <View style={styles.readOnlyRow}>
                  <ThemedText style={[styles.readOnlyText, { color: ui.mutedText }]}>
                    {isLoading ? "Loading linked account..." : "Linked account not found."}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : (
        <AccountsEditForm
          ui={ui}
          insets={insets}
          isDark={isDark}
          editName={editName}
          editBalance={editBalance}
          editLimit={editLimit}
          editInterest={editInterest}
          editStatementDate={editStatementDate}
          editPaymentDate={editPaymentDate}
          editCurrency={editCurrency}
          isLoading={isLoading}
          onSubmit={updateAccount}
          onDelete={deleteAccount}
          onNameChange={setEditName}
          onBalanceChange={setEditBalance}
          onLimitChange={setEditLimit}
          onInterestChange={setEditInterest}
          onStatementDateChange={setEditStatementDate}
          onPaymentDateChange={setEditPaymentDate}
          onCurrencyChange={setEditCurrency}
        />
      )}
    </>
  );
}

function DetailRow({
  label,
  value,
  ui,
  isLast = false,
}: {
  label: string;
  value: string;
  ui: Ui;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        { borderBottomColor: ui.border },
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      <ThemedText style={[styles.detailLabel, { color: ui.mutedText }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.detailValue, { color: ui.text }]}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 56,
    paddingVertical: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  sectionHeader: {
    paddingHorizontal: 4,
    marginBottom: 10,
    marginTop: 8,
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  readOnlyRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  readOnlyText: {
    fontSize: 16,
    lineHeight: 22,
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
  buttonDisabled: {
    opacity: 0.5,
  },
});
