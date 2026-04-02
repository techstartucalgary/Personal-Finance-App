import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { tabsTheme } from "@/constants/tabsTheme";
import { parseLocalDate, toLocalISOString } from "@/utils/date";

import { styles } from "../styles";
import type { AccountType } from "../types";

type Ui = typeof tabsTheme.ui;

type AccountsCreateModalProps = {
  visible: boolean;
  ui: Ui;
  insets: EdgeInsets;
  name: string;
  type: AccountType;
  typeModalOpen: boolean;
  createBalance: string;
  createLimit: string;
  createInterest: string;
  createStatementDate: string;
  createPaymentDate: string;
  createCurrency: string;
  canCreate: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onNameChange: (value: string) => void;
  onTypeChange: (value: AccountType) => void;
  onTypeModalChange: (open: boolean) => void;
  onBalanceChange: (value: string) => void;
  onLimitChange: (value: string) => void;
  onInterestChange: (value: string) => void;
  onStatementDateChange: (value: string) => void;
  onPaymentDateChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
};

// Modal used to create a new manual account.
export function AccountsCreateModal({
  visible,
  ui,
  insets,
  name,
  type,
  typeModalOpen,
  createBalance,
  createLimit,
  createInterest,
  createStatementDate,
  createPaymentDate,
  createCurrency,
  canCreate,
  isLoading,
  onClose,
  onSubmit,
  onNameChange,
  onTypeChange,
  onTypeModalChange,
  onBalanceChange,
  onLimitChange,
  onInterestChange,
  onStatementDateChange,
  onPaymentDateChange,
  onCurrencyChange,
}: AccountsCreateModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView
        style={{
          flex: 1,
          backgroundColor: ui.surface,
          padding: 16,
          paddingTop: Platform.OS === "ios" ? 12 : 16 + insets.top,
          paddingBottom: 16 + insets.bottom,
        }}
      >
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft} />
          <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>
            Add Account
          </ThemedText>
          <View style={styles.modalHeaderRight}>
            <Pressable
              onPress={onClose}
              hitSlop={20}
              style={[
                styles.modalCloseButton,
                { backgroundColor: ui.surface2 },
              ]}
            >
              <Feather name="x" size={18} color={ui.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          <ThemedText type="defaultSemiBold">Account name</ThemedText>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Account name (e.g. TD Credit)"
            placeholderTextColor={ui.mutedText}
            autoCapitalize="words"
            style={[
              styles.input,
              {
                borderColor: ui.border,
                backgroundColor: ui.surface2,
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
              onPress={() => onTypeModalChange(true)}
              style={[
                styles.dropdownButton,
                { borderColor: ui.border, backgroundColor: ui.surface2 },
              ]}
            >
              <ThemedText>{type === "credit" ? "Credit" : "Debit"}</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="defaultSemiBold">Balance</ThemedText>
          <TextInput
            value={createBalance}
            onChangeText={onBalanceChange}
            keyboardType="numeric"
            style={[
              styles.input,
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
            onChangeText={onLimitChange}
            keyboardType="numeric"
            style={[
              styles.input,
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
            onChangeText={onInterestChange}
            keyboardType="numeric"
            style={[
              styles.input,
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
            onChangeText={onCurrencyChange}
            autoCapitalize="characters"
            style={[
              styles.input,
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
            onChange={(date) => onStatementDateChange(toLocalISOString(date))}
            ui={ui}
          />

          <DateTimePickerField
            label="Payment Due Date"
            value={parseLocalDate(createPaymentDate)}
            onChange={(date) => onPaymentDateChange(toLocalISOString(date))}
            ui={ui}
          />

          <Pressable
            onPress={onSubmit}
            disabled={!canCreate || isLoading}
            style={[
              styles.button,
              {
                borderColor: ui.border,
                backgroundColor: ui.text,
                width: "100%",
                alignItems: "center",
                borderRadius: 24,
              },
              (!canCreate || isLoading) && styles.buttonDisabled,
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
              Create
            </ThemedText>
          </Pressable>
        </ScrollView>

        {/* Account Type Selection Modal (Add) */}
        <SelectionModal
          visible={typeModalOpen}
          onClose={() => onTypeModalChange(false)}
          title="Select Account Type"
          ui={ui}
        >
          <Pressable
            style={[
              styles.modalOption,
              { borderColor: ui.border, backgroundColor: ui.surface },
            ]}
            onPress={() => {
              onTypeChange("credit");
              onTypeModalChange(false);
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
              onTypeChange("debit");
              onTypeModalChange(false);
            }}
          >
            <ThemedText>Debit</ThemedText>
          </Pressable>
        </SelectionModal>
      </ThemedView>
    </Modal>
  );
}
