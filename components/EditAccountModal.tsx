import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { DateTimePickerField } from "./ui/DateTimePickerField";
import { IconSymbol } from "./ui/icon-symbol";
import { SelectionModal } from "./ui/SelectionModal";

import { deleteAccount as deleteAccountApi, updateAccount as updateAccountApi } from "@/utils/accounts";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import type { UnifiedAccount } from "./accounts/AccountCardCarousel";

// ── Types ──────────────────────────────────────────

type AccountType = "credit" | "debit";

interface EditAccountModalProps {
  visible: boolean;
  onClose: () => void;
  account: UnifiedAccount | null;
  onAccountUpdated: () => Promise<void>;
  onAccountDeleted: () => Promise<void>;
  ui: any;
  isDark: boolean;
  userId: string | undefined;
}

// ── Component ──────────────────────────────────────

export function EditAccountModal({
  visible,
  onClose,
  account,
  onAccountUpdated,
  onAccountDeleted,
  ui,
  isDark,
  userId,
}: EditAccountModalProps) {
  const insets = useSafeAreaInsets();

  // ── State ────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("credit");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [newCurrency, setNewCurrency] = useState("");

  const balanceInputRef = useRef<TextInput>(null);

  // Initialize state when account changes or modal opens
  useEffect(() => {
    if (visible && account?.kind === "manual") {
      const data = account.data;
      setName(data.account_name ?? "");
      setType((data.account_type as AccountType) ?? "credit");
      setBalance(data.balance?.toString() ?? "");
      setCreditLimit(data.credit_limit?.toString() ?? "");
      setInterestRate(data.interest_rate?.toString() ?? "");
      setStatementDate(data.statement_duedate ?? "");
      setPaymentDate(data.payment_duedate ?? "");
      setCurrency(data.currency ?? "CAD");
      setIsLoading(false);
    }
  }, [visible, account]);

  const isDirty = useMemo(() => {
    if (!account || account.kind !== "manual") return false;
    const data = account.data;
    return (
      name !== (data.account_name ?? "") ||
      type !== (data.account_type ?? "credit") ||
      balance !== (data.balance?.toString() ?? "") ||
      creditLimit !== (data.credit_limit?.toString() ?? "") ||
      interestRate !== (data.interest_rate?.toString() ?? "") ||
      statementDate !== (data.statement_duedate ?? "") ||
      paymentDate !== (data.payment_duedate ?? "") ||
      currency !== (data.currency ?? "CAD")
    );
  }, [account, name, type, balance, creditLimit, interestRate, statementDate, paymentDate, currency]);

  const canSave = useMemo(
    () => !!userId && name.trim().length > 0 && isDirty,
    [userId, name, isDirty],
  );

  // ── Update logic ─────────────────────────────────

  const handleUpdate = useCallback(async () => {
    if (!userId || !canSave || !account || account.kind !== "manual") return;
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
      account_name: name.trim(),
      account_type: type,
      balance: cleanNumber(balance, 0),
      credit_limit: cleanNumber(creditLimit, 0),
      statement_duedate: cleanText(statementDate, "2026-01-01"),
      payment_duedate: cleanText(paymentDate, "2026-01-01"),
      interest_rate: cleanNumber(interestRate, 0),
      currency: cleanText(currency, "CAD"),
    };

    try {
      await updateAccountApi({ id: account.data.id, profile_id: userId, update: payload });
    } catch (error) {
      console.error("Error updating account:", error);
      Alert.alert("Could not update account", "Please try again.");
      setIsLoading(false);
      return;
    }

    await onAccountUpdated();
    onClose();
    setIsLoading(false);
  }, [userId, canSave, account, name, type, balance, creditLimit, interestRate, statementDate, paymentDate, currency, onAccountUpdated, onClose]);

  // ── Delete logic ─────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!userId || !account || account.kind !== "manual") return;

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
              await deleteAccountApi({ id: account.data.id, profile_id: userId });
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert("Could not delete account", "Please try again.");
              setIsLoading(false);
              return;
            }
            await onAccountDeleted();
            onClose();
            setIsLoading(false);
          },
        },
      ],
    );
  }, [userId, account, onAccountDeleted, onClose]);

  // ── Render ───────────────────────────────────────

  if (!account || account.kind !== "manual") return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={{ flex: 1, backgroundColor: ui.surface }}>
        {/* Header */}
        <View style={[styles.modalHeader, { paddingTop: Platform.OS === "ios" ? 20 : (insets.top + 12) }]}>
          <View style={styles.headerSpacer} />
          <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>Edit Account</ThemedText>
          <View style={styles.headerRight}>
            <Pressable
              onPress={onClose}
              hitSlop={20}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
            >
              <Feather name="x" size={18} color={ui.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Section */}
          <View style={styles.amountSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>BALANCE</ThemedText>
            </View>
            <Pressable
              onPress={() => balanceInputRef.current?.focus()}
              style={({ pressed }) => [
                styles.amountContainer,
                {
                  backgroundColor: ui.accentSoft,
                  borderColor: ui.accent + '40',
                  opacity: pressed ? 0.9 : 1,
                }
              ]}
            >
              <ThemedText style={[styles.currencySymbol, { color: ui.accent }]}>$</ThemedText>
              <TextInput
                ref={balanceInputRef}
                value={balance}
                onChangeText={setBalance}
                onBlur={() => {
                  if (balance) {
                    const parsed = parseFloat(balance);
                    if (!isNaN(parsed)) {
                      setBalance(parsed.toFixed(2));
                    }
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={ui.accent + "80"}
                style={[styles.amountInput, { color: ui.accent }]}
              />
            </Pressable>
          </View>

          {/* Account Info Section */}
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>ACCOUNT INFO</ThemedText>
          </View>

          <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
            {/* Name */}
            <View style={styles.inputRow}>
              <IconSymbol name="signature" size={20} color={ui.mutedText} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Account Name"
                placeholderTextColor={ui.mutedText}
                autoCapitalize="words"
                style={[styles.rowInput, { color: ui.text }]}
              />
            </View>

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            {/* Type */}
            <Pressable onPress={() => setTypeModalOpen(true)} style={styles.inputRow}>
              <IconSymbol name="creditcard" size={20} color={ui.mutedText} />
              <ThemedText style={[styles.rowValue, { color: ui.text }]}>
                {type === "credit" ? "Credit" : "Debit"}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={ui.mutedText} />
            </Pressable>

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            {/* Currency */}
            <Pressable onPress={() => setCurrencyModalOpen(true)} style={styles.inputRow}>
              <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
              <ThemedText style={[styles.rowValue, { color: ui.text }]}>
                {currency}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={ui.mutedText} />
            </Pressable>
          </View>

          {/* Credit Details Section */}
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>CREDIT DETAILS</ThemedText>
          </View>

          <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
            {/* Credit Limit */}
            <View style={styles.inputRow}>
              <IconSymbol name="banknote" size={20} color={ui.mutedText} />
              <ThemedText style={styles.rowLabel}>Credit Limit</ThemedText>
              <TextInput
                value={creditLimit}
                onChangeText={setCreditLimit}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={ui.mutedText}
                style={[styles.rowValueInput, { color: ui.text }]}
              />
            </View>

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            {/* Interest Rate */}
            <View style={styles.inputRow}>
              <IconSymbol name="percent" size={20} color={ui.mutedText} />
              <ThemedText style={styles.rowLabel}>Interest Rate</ThemedText>
              <TextInput
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="numeric"
                placeholder="0%"
                placeholderTextColor={ui.mutedText}
                style={[styles.rowValueInput, { color: ui.text }]}
              />
            </View>
          </View>

          {/* Dates Section */}
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>DUE DATES</ThemedText>
          </View>

          <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
            <DateTimePickerField
              label="Statement Due"
              value={parseLocalDate(statementDate)}
              onChange={(date) => setStatementDate(toLocalISOString(date))}
              ui={ui}
              icon="calendar"
            />

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            <DateTimePickerField
              label="Payment Due"
              value={parseLocalDate(paymentDate)}
              onChange={(date) => setPaymentDate(toLocalISOString(date))}
              ui={ui}
              icon="calendar.badge.clock"
            />
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleUpdate}
            disabled={!canSave || isLoading}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: isDark ? "#FFFFFF" : "#000000",
                borderColor: ui.border,
                marginTop: 32,
                opacity: pressed ? 0.8 : 1,
              },
              (!canSave || isLoading) && styles.buttonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={isDark ? "#1C1C1E" : "#FFFFFF"} />
            ) : (
              <ThemedText type="defaultSemiBold" style={{ color: isDark ? "#1C1C1E" : "#FFFFFF" }}>
                Save Changes
              </ThemedText>
            )}
          </Pressable>

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: isDark ? "rgba(255,59,48,0.15)" : "rgba(255,59,48,0.1)",
                borderColor: isDark ? "rgba(255,59,48,0.4)" : "rgba(255,59,48,0.3)",
                marginTop: 16,
                opacity: pressed ? 0.7 : 1,
              },
              isLoading && styles.buttonDisabled,
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: "#FF3B30" }}>
              Delete Account
            </ThemedText>
          </Pressable>
        </ScrollView>

        {/* Type Picker */}
        <SelectionModal
          visible={typeModalOpen}
          onClose={() => setTypeModalOpen(false)}
          title="Select Account Type"
          ui={ui}
        >
          {(["credit", "debit"] as const).map((t) => (
            <Pressable
              key={t}
              style={({ pressed }) => [
                styles.modalOption,
                {
                  borderColor: ui.border,
                  backgroundColor: type === t ? ui.accentSoft : ui.surface2,
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
              onPress={() => {
                setType(t);
                setTypeModalOpen(false);
              }}
            >
              <ThemedText style={{ color: type === t ? ui.accent : ui.text }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </ThemedText>
              {type === t && (
                <IconSymbol name="checkmark" size={18} color={ui.accent} />
              )}
            </Pressable>
          ))}
        </SelectionModal>

        {/* Currency Picker */}
        <SelectionModal
          visible={currencyModalOpen}
          onClose={() => setCurrencyModalOpen(false)}
          title="Select Currency"
          ui={ui}
          layout="tags"
          footer={
            <View style={styles.footerRow}>
              <TextInput
                value={newCurrency}
                onChangeText={setNewCurrency}
                placeholder="Custom (e.g. JPY)"
                placeholderTextColor={ui.mutedText}
                autoCapitalize="characters"
                style={[styles.footerInput, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]}
              />
              <Pressable
                onPress={() => {
                  const trimmed = newCurrency.trim().toUpperCase();
                  if (trimmed) {
                    setCurrency(trimmed);
                    setNewCurrency("");
                    setCurrencyModalOpen(false);
                  }
                }}
                style={({ pressed }) => [
                  styles.footerAddButton,
                  {
                    backgroundColor: ui.accent,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <IconSymbol name="plus" size={24} color={ui.surface} />
              </Pressable>
            </View>
          }
        >
          {["CAD", "USD", "EUR", "GBP", "AUD"].map((curr) => (
            <Pressable
              key={curr}
              style={({ pressed }) => [
                styles.tag,
                {
                  borderColor: ui.border,
                  backgroundColor: currency === curr ? ui.accentSoft : ui.surface2,
                  opacity: pressed ? 0.7 : 1,
                  paddingRight: 16,
                }
              ]}
              onPress={() => {
                setCurrency(curr);
                setCurrencyModalOpen(false);
              }}
            >
              <ThemedText style={{ color: currency === curr ? ui.accent : ui.text, fontWeight: '500' }}>
                {curr}
              </ThemedText>
              {currency === curr && (
                <IconSymbol name="checkmark" size={14} color={ui.accent} style={{ marginLeft: 6 }} />
              )}
            </Pressable>
          ))}
        </SelectionModal>
      </ThemedView>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 20 : 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 44,
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  amountSection: {
    marginBottom: 20,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: "800",
    marginRight: 4,
    lineHeight: 56,
    paddingVertical: 8,
    includeFontPadding: false,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 56,
    paddingVertical: 8,
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  rowValue: {
    flex: 1,
    fontSize: 16,
    textAlign: "right",
    marginRight: 8,
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
  button: {
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
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOption: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  footerInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  footerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
