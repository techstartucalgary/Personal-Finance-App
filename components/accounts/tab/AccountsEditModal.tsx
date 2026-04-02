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
import { tabsTheme } from "@/constants/tabsTheme";
import { parseLocalDate, toLocalISOString } from "@/utils/date";

import { styles } from "./styles";

type Ui = typeof tabsTheme.ui;

type AccountsEditModalProps = {
  visible: boolean;
  ui: Ui;
  insets: EdgeInsets;
  editName: string;
  editBalance: string;
  editLimit: string;
  editInterest: string;
  editStatementDate: string;
  editPaymentDate: string;
  editCurrency: string;
  isLoading: boolean;
  onClose: () => void;
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

// Modal used to edit an existing manual account.
export function AccountsEditModal({
  visible,
  ui,
  insets,
  editName,
  editBalance,
  editLimit,
  editInterest,
  editStatementDate,
  editPaymentDate,
  editCurrency,
  isLoading,
  onClose,
  onSubmit,
  onDelete,
  onNameChange,
  onBalanceChange,
  onLimitChange,
  onInterestChange,
  onStatementDateChange,
  onPaymentDateChange,
  onCurrencyChange,
}: AccountsEditModalProps) {
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
            Edit Account
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

        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
          <View style={{ gap: 6 }}>
            <ThemedText type="defaultSemiBold">Account Name</ThemedText>
            <TextInput
              value={editName}
              onChangeText={onNameChange}
              style={[
                styles.input,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface2,
                  color: ui.text,
                },
              ]}
            />
          </View>

          <View style={{ gap: 6 }}>
            <ThemedText type="defaultSemiBold">Balance</ThemedText>
            <TextInput
              value={editBalance}
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
          </View>

          <View style={{ gap: 6 }}>
            <ThemedText type="defaultSemiBold">Credit Limit</ThemedText>
            <TextInput
              value={editLimit}
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
          </View>

          <View style={{ gap: 6 }}>
            <ThemedText type="defaultSemiBold">Interest Rate (%)</ThemedText>
            <TextInput
              value={editInterest}
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
          </View>

          <View style={{ gap: 6 }}>
            <ThemedText type="defaultSemiBold">Currency</ThemedText>
            <TextInput
              value={editCurrency}
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
          </View>

          {/* Native Date Pickers */}
          <DateTimePickerField
            label="Statement Due Date"
            value={parseLocalDate(editStatementDate)}
            onChange={(date) => onStatementDateChange(toLocalISOString(date))}
            ui={ui}
          />

          <DateTimePickerField
            label="Payment Due Date"
            value={parseLocalDate(editPaymentDate)}
            onChange={(date) => onPaymentDateChange(toLocalISOString(date))}
            ui={ui}
          />

          <Pressable
            onPress={onSubmit}
            style={[
              styles.button,
              {
                backgroundColor: ui.text,
                borderColor: ui.border,
                alignSelf: "center",
                width: "100%",
                alignItems: "center",
                marginTop: 16,
                paddingVertical: 12,
                borderRadius: 24,
              },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
              Save Changes
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onDelete}
            disabled={isLoading}
            style={[
              styles.deleteAction,
              {
                borderColor: ui.border,
                backgroundColor: ui.surface2,
                borderRadius: 24,
              },
              isLoading && styles.buttonDisabled,
            ]}
          >
            <ThemedText style={{ color: ui.danger, fontWeight: "600" }}>
              Delete Account
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}
