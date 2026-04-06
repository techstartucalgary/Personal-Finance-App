import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { createAccount as createAccountApi } from "@/utils/accounts";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { styles as tabStyles } from "@/components/accounts/tab/styles";
import type { AccountType } from "@/components/accounts/tab/types";

export default function AddAccountManualScreen() {
  const router = useRouter();
  const ui = useThemeUI();
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();
  const userId = session?.user.id;

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("credit");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [createBalance, setCreateBalance] = useState("");
  const [createLimit, setCreateLimit] = useState("");
  const [createInterest, setCreateInterest] = useState("");
  const [createStatementDate, setCreateStatementDate] = useState("2026-01-01");
  const [createPaymentDate, setCreatePaymentDate] = useState("2026-01-01");
  const [createCurrency, setCreateCurrency] = useState("CAD");

  const canCreate = useMemo(
    () => !!userId && name.trim().length > 0,
    [userId, name]
  );

  const handleCreate = useCallback(async () => {
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
      // Success! Dismiss the entire modal stack
      router.dismissAll();
    } catch (error) {
      console.error("Error adding account:", error);
      Alert.alert("Could not add account", "Please try again.");
    } finally {
      setIsLoading(false);
    }
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
    router,
  ]);

  return (
    <ThemedView
      style={{
        flex: 1,
        backgroundColor: ui.surface,
        padding: 16,
        paddingTop: Platform.OS === "ios" ? 12 : 16 + insets.top,
        paddingBottom: 16 + insets.bottom,
      }}
    >
      <View style={tabStyles.modalHeader}>
        <View style={tabStyles.modalHeaderLeft} />
        <ThemedText type="defaultSemiBold" style={tabStyles.modalHeaderTitle}>
          Add Account
        </ThemedText>
        <View style={tabStyles.modalHeaderRight}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={20}
            style={[
              tabStyles.modalCloseButton,
              { backgroundColor: ui.surface2 },
            ]}
          >
            <Feather name="x" size={18} color={ui.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <ThemedText type="defaultSemiBold">Account name</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Account name (e.g. TD Credit)"
          placeholderTextColor={ui.mutedText}
          autoCapitalize="words"
          style={[
            tabStyles.input,
            {
              borderColor: ui.border,
              backgroundColor: ui.surface2,
              color: ui.text,
            },
          ]}
        />

        <View
          style={[
            tabStyles.pickerContainer,
            { borderColor: ui.border, backgroundColor: ui.surface },
          ]}
        >
          <ThemedText type="defaultSemiBold">Account type</ThemedText>
          <Pressable
            onPress={() => setTypeModalOpen(true)}
            style={[
              tabStyles.dropdownButton,
              { borderColor: ui.border, backgroundColor: ui.surface2 },
            ]}
          >
            <ThemedText>{type === "credit" ? "Credit" : "Debit"}</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="defaultSemiBold">Balance</ThemedText>
        <TextInput
          value={createBalance}
          onChangeText={setCreateBalance}
          keyboardType="numeric"
          style={[
            tabStyles.input,
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
            tabStyles.input,
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
            tabStyles.input,
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
            tabStyles.input,
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
          onPress={handleCreate}
          disabled={!canCreate || isLoading}
          style={[
            tabStyles.button,
            {
              borderColor: ui.border,
              backgroundColor: ui.text,
              width: "100%",
              alignItems: "center",
              borderRadius: 24,
              marginTop: 12,
            },
            (!canCreate || isLoading) && tabStyles.buttonDisabled,
          ]}
        >
          <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
            {isLoading ? "Creating..." : "Create"}
          </ThemedText>
        </Pressable>
      </ScrollView>

      {/* Account Type Selection Pop-over */}
      <SelectionModal
        visible={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        title="Select Account Type"
        ui={ui}
      >
        <Pressable
          style={[
            tabStyles.modalOption,
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
            tabStyles.modalOption,
            { borderColor: ui.border, backgroundColor: ui.surface },
          ]}
          onPress={() => {
            setType("debit");
            setTypeModalOpen(false);
          }}
        >
          <ThemedText>Debit</ThemedText>
        </Pressable>
      </SelectionModal>
    </ThemedView>
  );
}
