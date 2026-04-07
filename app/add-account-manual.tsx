import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles as tabStyles } from "@/components/accounts/tab/styles";
import type { AccountType } from "@/components/accounts/tab/types";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { createAccount as createAccountApi } from "@/utils/accounts";
import { parseLocalDate, toLocalISOString } from "@/utils/date";

export default function AddAccountManualScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const ui = useThemeUI();
  const insets = useSafeAreaInsets();
  const amountInputRef = useRef<TextInput>(null);
  const { session } = useAuthContext();
  const userId = session?.user.id;
  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E";
  const pageBackground = isDark ? ui.surface : "#F2F2F7";
  const cardBackground = isDark ? ui.surface2 : "#FFFFFF";
  const heroBackground = isDark ? "rgba(140,242,209,0.12)" : ui.accentSoft;

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

  useEffect(() => {
    navigation.setOptions({
      title: "Add Account",
      headerBackVisible: false,
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : pageBackground,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
      headerLeft: () => (
        <Pressable
          onPress={() => router.dismissAll()}
          hitSlop={10}
          style={({ pressed }) => ({
            minWidth: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <IconSymbol name="xmark" size={22} color={ui.text} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleCreate}
          disabled={!canCreate || isLoading}
          hitSlop={10}
          style={({ pressed }) => ({
            minWidth: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed || !canCreate || isLoading ? 0.55 : 1,
          })}
        >
          <IconSymbol name="checkmark" size={22} color={ui.accent} />
        </Pressable>
      ),
    });
  }, [canCreate, handleCreate, isLoading, navigation, pageBackground, router, ui.accent, ui.text]);

  return (
    <ThemedView
      style={{
        flex: 1,
        backgroundColor: pageBackground,
      }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: 14,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.heroSection}>
          <View style={localStyles.sectionHeader}>
            <ThemedText style={[localStyles.sectionHeaderText, { color: ui.mutedText }]}>
              STARTING BALANCE
            </ThemedText>
          </View>
          <Pressable
            onPress={() => amountInputRef.current?.focus()}
            style={({ pressed }) => [
              localStyles.amountContainer,
              {
                backgroundColor: heroBackground,
                borderColor: `${ui.accent}40`,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={[localStyles.currencySymbol, { color: ui.accent }]}>
              $
            </ThemedText>
            <TextInput
              ref={amountInputRef}
              value={createBalance}
              onChangeText={setCreateBalance}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={`${ui.accent}88`}
              style={[localStyles.amountInput, { color: ui.accent }]}
            />
          </Pressable>
        </View>

        <View style={localStyles.sectionHeader}>
          <ThemedText style={[localStyles.sectionHeaderText, { color: ui.mutedText }]}>
            ACCOUNT INFO
          </ThemedText>
        </View>

        <View
          style={[
            localStyles.groupCard,
            { borderColor: ui.border, backgroundColor: cardBackground },
          ]}
        >
          <View style={localStyles.inputRow}>
            <IconSymbol name="signature" size={20} color={ui.mutedText} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Account name"
              placeholderTextColor={ui.mutedText}
              autoCapitalize="words"
              style={[localStyles.rowInput, { color: ui.text }]}
            />
          </View>

          <View style={[localStyles.rowSeparator, { backgroundColor: ui.border }]} />

          <Pressable onPress={() => setTypeModalOpen(true)} style={localStyles.inputRow}>
            <IconSymbol name="creditcard" size={20} color={ui.mutedText} />
            <ThemedText style={[localStyles.rowLabel, { color: ui.text }]}>
              Account type
            </ThemedText>
            <ThemedText style={[localStyles.rowValue, { color: ui.text }]}>
              {type === "credit" ? "Credit" : "Debit"}
            </ThemedText>
            <Feather name="chevron-right" size={16} color={ui.mutedText} />
          </Pressable>

          <View style={[localStyles.rowSeparator, { backgroundColor: ui.border }]} />

          <View style={localStyles.inputRow}>
            <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
            <ThemedText style={[localStyles.rowLabel, { color: ui.text }]}>
              Currency
            </ThemedText>
            <TextInput
              value={createCurrency}
              onChangeText={setCreateCurrency}
              autoCapitalize="characters"
              placeholder="CAD"
              placeholderTextColor={ui.mutedText}
              style={[localStyles.rowValueInput, { color: ui.text }]}
            />
          </View>
        </View>

        <View style={localStyles.sectionHeader}>
          <ThemedText style={[localStyles.sectionHeaderText, { color: ui.mutedText }]}>
            CREDIT DETAILS
          </ThemedText>
        </View>

        <View
          style={[
            localStyles.groupCard,
            { borderColor: ui.border, backgroundColor: cardBackground },
          ]}
        >
          <View style={localStyles.inputRow}>
            <IconSymbol name="banknote" size={20} color={ui.mutedText} />
            <ThemedText style={[localStyles.rowLabel, { color: ui.text }]}>
              Credit limit
            </ThemedText>
            <TextInput
              value={createLimit}
              onChangeText={setCreateLimit}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={ui.mutedText}
              style={[localStyles.rowValueInput, { color: ui.text }]}
            />
          </View>

          <View style={[localStyles.rowSeparator, { backgroundColor: ui.border }]} />

          <View style={localStyles.inputRow}>
            <IconSymbol name="percent" size={20} color={ui.mutedText} />
            <ThemedText style={[localStyles.rowLabel, { color: ui.text }]}>
              Interest rate
            </ThemedText>
            <TextInput
              value={createInterest}
              onChangeText={setCreateInterest}
              keyboardType="decimal-pad"
              placeholder="0%"
              placeholderTextColor={ui.mutedText}
              style={[localStyles.rowValueInput, { color: ui.text }]}
            />
          </View>
        </View>

        <View style={localStyles.sectionHeader}>
          <ThemedText style={[localStyles.sectionHeaderText, { color: ui.mutedText }]}>
            DUE DATES
          </ThemedText>
        </View>

        <View
          style={[
            localStyles.groupCard,
            { borderColor: ui.border, backgroundColor: cardBackground },
          ]}
        >
          <DateTimePickerField
            label="Statement Due Date"
            value={parseLocalDate(createStatementDate)}
            onChange={(date) => setCreateStatementDate(toLocalISOString(date))}
            ui={ui}
          />

          <View style={[localStyles.rowSeparator, { backgroundColor: ui.border }]} />

          <DateTimePickerField
            label="Payment Due Date"
            value={parseLocalDate(createPaymentDate)}
            onChange={(date) => setCreatePaymentDate(toLocalISOString(date))}
            ui={ui}
          />
        </View>
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

const localStyles = StyleSheet.create({
  heroSection: {
    gap: 8,
  },
  sectionHeader: {
    marginTop: 6,
  },
  sectionHeaderText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  currencySymbol: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    paddingVertical: 0,
  },
  groupCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  inputRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  rowValue: {
    fontSize: 16,
  },
  rowInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  rowValueInput: {
    minWidth: 72,
    textAlign: "right",
    fontSize: 16,
    paddingVertical: 0,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
});
