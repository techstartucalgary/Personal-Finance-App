import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tabsTheme } from "@/constants/tabsTheme";
import { parseLocalDate, toLocalISOString } from "@/utils/date";

type Ui = typeof tabsTheme.ui;

type AccountsEditFormProps = {
  ui: Ui;
  insets: EdgeInsets;
  isDark: boolean;
  editName: string;
  editBalance: string;
  editLimit: string;
  editInterest: string;
  editStatementDate: string;
  editPaymentDate: string;
  editCurrency: string;
  isLoading: boolean;
  saveLabel?: string;
  deleteLabel?: string;
  onSubmit: () => void;
  onDelete: () => void;
  onNameChange: (value: string) => void;
  onBalanceChange: (value: string) => void;
  onLimitChange: (value: string) => void;
  onInterestChange: (value: string) => void;
  onStatementDateChange: (value: string) => void;
  onPaymentDateChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
};

export function AccountsEditForm({
  ui,
  insets,
  isDark,
  editName,
  editBalance,
  editLimit,
  editInterest,
  editStatementDate,
  editPaymentDate,
  editCurrency,
  isLoading,
  saveLabel = "Save Account",
  deleteLabel = "Delete Account",
  onSubmit,
  onDelete,
  onNameChange,
  onBalanceChange,
  onLimitChange,
  onInterestChange,
  onStatementDateChange,
  onPaymentDateChange,
  onCurrencyChange,
}: AccountsEditFormProps) {
  const pageBackground = isDark ? ui.surface : ui.surface2;
  const cardBackground = isDark ? ui.surface2 : ui.surface;

  return (
    <ThemedView style={{ flex: 1, backgroundColor: pageBackground }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={localStyles.amountSection}>
          <View style={localStyles.sectionHeader}>
            <ThemedText style={[localStyles.sectionHeaderText, { color: ui.mutedText }]}>
              BALANCE
            </ThemedText>
          </View>
          <View
            style={[
              localStyles.amountContainer,
              {
                backgroundColor: ui.accentSoft,
                borderColor: `${ui.accent}60`,
              },
            ]}
          >
            <ThemedText style={[localStyles.currencySymbol, { color: ui.accent }]}>
              $
            </ThemedText>
            <TextInput
              value={editBalance}
              onChangeText={onBalanceChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={`${ui.accent}80`}
              style={[localStyles.amountInput, { color: ui.accent }]}
            />
          </View>
        </View>

        <View style={localStyles.sectionHeader}>
          <ThemedText style={[localStyles.sectionHeaderText, { color: ui.mutedText }]}>
            ACCOUNT INFO
          </ThemedText>
        </View>

        <View
          style={[
            localStyles.groupCard,
            { backgroundColor: cardBackground, borderColor: ui.border },
          ]}
        >
          <View style={localStyles.inputRow}>
            <IconSymbol name="signature" size={20} color={ui.mutedText} />
            <TextInput
              value={editName}
              onChangeText={onNameChange}
              placeholder="Account Name"
              placeholderTextColor={ui.mutedText}
              autoCapitalize="words"
              style={[localStyles.rowInput, { color: ui.text }]}
            />
          </View>

          <View style={[localStyles.rowSeparator, { backgroundColor: ui.border }]} />

          <View style={localStyles.inputRow}>
            <IconSymbol name="dollarsign.circle" size={20} color={ui.mutedText} />
            <ThemedText style={localStyles.rowLabel}>Currency</ThemedText>
            <TextInput
              value={editCurrency}
              onChangeText={onCurrencyChange}
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
            { backgroundColor: cardBackground, borderColor: ui.border },
          ]}
        >
          <View style={localStyles.inputRow}>
            <IconSymbol name="banknote" size={20} color={ui.mutedText} />
            <ThemedText style={localStyles.rowLabel}>Credit Limit</ThemedText>
            <TextInput
              value={editLimit}
              onChangeText={onLimitChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={ui.mutedText}
              style={[localStyles.rowValueInput, { color: ui.text }]}
            />
          </View>

          <View style={[localStyles.rowSeparator, { backgroundColor: ui.border }]} />

          <View style={localStyles.inputRow}>
            <IconSymbol name="percent" size={20} color={ui.mutedText} />
            <ThemedText style={localStyles.rowLabel}>Interest Rate</ThemedText>
            <TextInput
              value={editInterest}
              onChangeText={onInterestChange}
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
            { backgroundColor: cardBackground, borderColor: ui.border },
          ]}
        >
          <DateTimePickerField
            label="Statement Due"
            value={parseLocalDate(editStatementDate)}
            onChange={(date) => onStatementDateChange(toLocalISOString(date))}
            ui={ui}
            icon="calendar"
          />

          <View style={[localStyles.rowSeparator, { backgroundColor: ui.border }]} />

          <DateTimePickerField
            label="Payment Due"
            value={parseLocalDate(editPaymentDate)}
            onChange={(date) => onPaymentDateChange(toLocalISOString(date))}
            ui={ui}
            icon="calendar.badge.clock"
          />
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={isLoading}
          style={({ pressed }) => [
            localStyles.button,
            {
              backgroundColor: ui.text,
              borderColor: ui.border,
              marginTop: 32,
              opacity: pressed ? 0.8 : 1,
            },
            isLoading && localStyles.buttonDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={ui.surface} />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
              {saveLabel}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          onPress={onDelete}
          disabled={isLoading}
          style={({ pressed }) => [
            localStyles.deleteButton,
            {
              borderColor: ui.border,
              backgroundColor: cardBackground,
              marginTop: 12,
              opacity: pressed ? 0.7 : 1,
            },
            isLoading && localStyles.buttonDisabled,
          ]}
        >
          <Feather name="trash-2" size={16} color={ui.danger} />
          <ThemedText type="defaultSemiBold" style={{ color: ui.danger }}>
            {deleteLabel}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const localStyles = StyleSheet.create({
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
    lineHeight: 56,
    marginRight: 4,
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
  rowInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  rowValueInput: {
    minWidth: 88,
    fontSize: 16,
    textAlign: "right",
    padding: 0,
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
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
