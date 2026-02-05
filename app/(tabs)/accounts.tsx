import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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

import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  createAccount as createAccountApi,
  deleteAccount as deleteAccountApi,
  updateAccount as updateAccountApi,
} from "@/utils/accounts";
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

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();

  const router = useRouter();

  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const ui = useMemo(
    () => ({
      surface: isDark ? "#121212" : "#ffffff",
      surface2: isDark ? "#1a1a1a" : "#ffffff",
      border: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
      text: isDark ? "#ffffff" : "#111111",
      mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
      backdrop: "rgba(0,0,0,0.45)",
    }),
    [isDark],
  );

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);

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

  const canCreate = useMemo(
    () => !!userId && name.trim().length > 0,
    [userId, name],
  );

  const loadAccounts = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      return;
    }

    // load accounts from user, where profile id == current user id
    setIsLoading(true);
    const { data, error } = await supabase
      .from("account")
      .select(
        "id, profile_id, created_at, account_name, account_type, balance, credit_limit, statement_duedate, payment_duedate, interest_rate, currency",
      )
      .eq("profile_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading accounts:", error);
      setIsLoading(false);
      return;
    }

    setAccounts((data as AccountRow[]) ?? []);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

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
      console.error("Error creating account:", error);
      Alert.alert("Could not create account", "Please try again.");
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
        "This will delete all transactions associated with the eaccount.\n\nThis action cannot be undone.",
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
              setIsLoading(false);
            },
          },
        ],
      );
    },
    [userId, loadAccounts],
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
          paddingTop: 16 + insets.top,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
          <ThemedText type="title">Accounts</ThemedText>
          <Pressable onPress={() => router.push("/profile")}>
            <IconSymbol size={28} name="person" color={ui.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            { borderColor: ui.border, backgroundColor: ui.surface2 },
          ]}
        >
          <ThemedText type="defaultSemiBold">Your accounts</ThemedText>
          {accounts.length === 0 ? (
            <ThemedText>
              {isLoading ? "Loading…" : "No accounts yet. Create one above."}
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
                      : "—"}
                  </ThemedText>
                  <ThemedText>Balance: {item.balance ?? 0}</ThemedText>
                  <ThemedText>{item.currency}</ThemedText>
                </View>

                <Pressable
                  onPress={() => deleteAccount(item.id)}
                  hitSlop={10}
                  style={[
                    styles.deleteButton,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                >
                  <ThemedText>Delete</ThemedText>
                </Pressable>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => setCreateModalOpen(true)}
        style={({ pressed }) => [
          styles.fabCenter,
          {
            backgroundColor: ui.text,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <ThemedText style={{ color: ui.surface, fontSize: 20 }}>
          + Account
        </ThemedText>
      </Pressable>

      <Modal
        visible={createModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
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
            <ThemedText type="title">Create account</ThemedText>
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

      {/* Edit Account Modal */}
      <Modal
        visible={!!editingAccount}
        animationType="slide"
        presentationStyle="fullScreen"
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
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  scrollContent: {
    gap: 12,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    bottom: 24,
    alignSelf: "center",
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
