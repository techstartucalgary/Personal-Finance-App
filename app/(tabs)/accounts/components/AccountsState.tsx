import React from "react";
import { View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { tabsTheme } from "@/constants/tabsTheme";

import { styles } from "../styles";

type Ui = typeof tabsTheme.ui;

type AccountsStateProps = {
  ui: Ui;
  insets: EdgeInsets;
};

// Minimal, reusable state shells for the auth boundary.
export function AccountsLoadingState({ ui, insets }: AccountsStateProps) {
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: ui.bg, paddingTop: 16 + insets.top },
      ]}
    >
      <View style={styles.stateWrap}>
        <ThemedText style={{ color: ui.text }}>Loading...</ThemedText>
      </View>
    </View>
  );
}

export function AccountsSignedOutState({ ui, insets }: AccountsStateProps) {
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: ui.bg, paddingTop: 16 + insets.top },
      ]}
    >
      <View style={styles.stateWrap}>
        <ThemedText type="title" style={{ color: ui.text }}>
          Accounts
        </ThemedText>
        <ThemedText style={{ color: ui.mutedText }}>
          Please sign in to view accounts.
        </ThemedText>
      </View>
    </View>
  );
}
