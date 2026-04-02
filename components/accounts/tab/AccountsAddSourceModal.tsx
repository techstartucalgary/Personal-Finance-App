import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { tabsTheme } from "@/constants/tabsTheme";

import { styles } from "./styles";

type Ui = typeof tabsTheme.ui;

type AccountsAddSourceModalProps = {
  visible: boolean;
  ui: Ui;
  isConnecting: boolean;
  onClose: () => void;
  onCreateManual: () => void;
  onConnectBank: () => void;
};

// Sheet for choosing how a new account is added.
export function AccountsAddSourceModal({
  visible,
  ui,
  isConnecting,
  onClose,
  onCreateManual,
  onConnectBank,
}: AccountsAddSourceModalProps) {
  return (
    <SelectionModal
      visible={visible}
      onClose={onClose}
      title="Add Account"
      ui={ui}
    >
      <ThemedText
        style={{
          color: ui.mutedText,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        How would you like to add your new account?
      </ThemedText>

      <Pressable
        style={[
          styles.modalOption,
          {
            borderColor: ui.border,
            backgroundColor: ui.surface,
            flexDirection: "row",
            justifyContent: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 12,
            borderWidth: StyleSheet.hairlineWidth,
          },
        ]}
        onPress={onCreateManual}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: ui.surface2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="edit-2" size={18} color={ui.text} />
        </View>
        <View>
          <ThemedText type="defaultSemiBold">Self-Managed Account</ThemedText>
          <ThemedText
            style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}
          >
            Enter transactions yourself
          </ThemedText>
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.modalOption,
          {
            borderColor: ui.border,
            backgroundColor: ui.surface,
            flexDirection: "row",
            justifyContent: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 12,
            borderWidth: StyleSheet.hairlineWidth,
          },
        ]}
        disabled={isConnecting}
        onPress={onConnectBank}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: ui.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color={ui.accent} />
          ) : (
            <Feather name="link" size={18} color={ui.accent} />
          )}
        </View>
        <View>
          <ThemedText type="defaultSemiBold">
            {isConnecting ? "Connecting..." : "Connect Bank"}
          </ThemedText>
          <ThemedText
            style={{ color: ui.mutedText, fontSize: 13, marginTop: 2 }}
          >
            Sync automatically via Plaid
          </ThemedText>
        </View>
      </Pressable>
    </SelectionModal>
  );
}
