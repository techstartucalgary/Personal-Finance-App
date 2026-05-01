import React from "react";
import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { tabsTheme } from "@/constants/tabsTheme";

import { styles } from "./styles";

type Ui = typeof tabsTheme.ui;

type AccountsSectionHeaderProps = {
  ui: Ui;
  title: string;
  subtitle?: string;
};

// Shared section header for list groupings.
export function AccountsSectionHeader({
  ui,
  title,
  subtitle,
}: AccountsSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.sectionSubtitle, { color: ui.mutedText }]}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}
