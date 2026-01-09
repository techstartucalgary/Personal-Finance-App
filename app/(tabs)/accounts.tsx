import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuthContext } from "@/hooks/use-auth-context";
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

export default function AccountsScreen() {
  const { session, isLoading: authLoading } = useAuthContext();

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
    [isDark]
  );

  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);

  // Minimal create form
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("credit");
  const [typeModalOpen, setTypeModalOpen] = useState(false);

  const canCreate = useMemo(
    () => !!userId && name.trim().length > 0,
    [userId, name]
  );

  const loadAccounts = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("account")
      .select(
        "id, profile_id, created_at, account_name, account_type, balance, credit_limit, statement_duedate, payment_duedate, interest_rate, currency"
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

  const createAccount = useCallback(async () => {
    if (!userId) return;
    if (!canCreate) return;

    setIsLoading(true);

    const payload = {
      profile_id: userId,
      account_name: name.trim(),
      account_type: type,
      balance: 0,
      currency: "CAD",
    };

    const { error } = await supabase.from("account").insert(payload);

    if (error) {
      console.error("Error creating account:", error);
      Alert.alert("Could not create account", error.message);
      setIsLoading(false);
      return;
    }

    setName("");
    setType("credit");
    await loadAccounts();
    setIsLoading(false);
  }, [userId, canCreate, name, type, loadAccounts]);

  const deleteAccount = useCallback(
    async (accountId: string) => {
      if (!userId) return;

      Alert.alert("Delete account?", "This action cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);

            const { error } = await supabase
              .from("account")
              .delete()
              .eq("id", accountId)
              .eq("profile_id", userId);

            if (error) {
              console.error("Error deleting account:", error);
              Alert.alert("Could not delete account", error.message);
              setIsLoading(false);
              return;
            }

            await loadAccounts();
            setIsLoading(false);
          },
        },
      ]);
    },
    [userId, loadAccounts]
  );

  if (authLoading && !session) {
    return (
      <ThemedView
        style={[
          styles.container,
          {
            paddingTop: 16 + insets.top,
          },
        ]}
      >
        <ThemedText>Loading…</ThemedText>
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedView
        style={[
          styles.container,
          {
            paddingTop: 16 + insets.top,
          },
        ]}
      >
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
      <ThemedText type="title">Accounts</ThemedText>

      <View
        style={[
          styles.card,
          { borderColor: ui.border, backgroundColor: ui.surface2 },
        ]}
      >
        <ThemedText type="defaultSemiBold">Create an account</ThemedText>

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
            <ThemedText>{type === "credit" ? "Credit" : "Debit"}</ThemedText>
          </Pressable>
        </View>

        <Modal
          visible={typeModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setTypeModalOpen(false)}
        >
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: ui.backdrop }]}
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
        </Modal>

        <Pressable
          onPress={createAccount}
          disabled={!canCreate || isLoading}
          style={[
            styles.button,
            { borderColor: ui.border, backgroundColor: ui.surface2 },
            (!canCreate || isLoading) && styles.buttonDisabled,
          ]}
        >
          <ThemedText type="defaultSemiBold">Create</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={loadAccounts}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText>
            {isLoading ? "Loading…" : "No accounts yet. Create one above."}
          </ThemedText>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              { borderColor: ui.border, backgroundColor: ui.surface2 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">
                {item.account_name ?? "Unnamed account"}
              </ThemedText>
              <ThemedText type="default">{item.account_type ?? "—"}</ThemedText>
              <ThemedText>Balance: {item.balance ?? 0}</ThemedText>
            </View>

            <Pressable
              onPress={() => deleteAccount(item.id)}
              style={[
                styles.deleteButton,
                { borderColor: ui.border, backgroundColor: ui.surface },
              ]}
            >
              <ThemedText>Delete</ThemedText>
            </Pressable>
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerContainer: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
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
  list: { paddingTop: 8, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
