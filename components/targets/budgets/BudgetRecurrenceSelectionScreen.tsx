import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTabsTheme } from "@/constants/tabsTheme";
import type { BudgetPeriod } from "@/utils/categoryBudgets";

import { BUDGET_PERIOD_OPTIONS, formatBudgetPeriodLabel } from "./utils";

type BudgetRecurrenceSelectionScreenProps = {
  currentPeriod: BudgetPeriod;
  onSelectPeriod: (period: BudgetPeriod) => void;
};

export function BudgetRecurrenceSelectionScreen({
  currentPeriod,
  onSelectPeriod,
}: BudgetRecurrenceSelectionScreenProps) {
  const navigation = useNavigation();
  const { ui } = useTabsTheme();

  useEffect(() => {
    navigation.setOptions({
      title: "Select Recurrence",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.text,
    });
  }, [navigation, ui.bg, ui.text]);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: ui.surface, borderColor: ui.border }]}>
          {BUDGET_PERIOD_OPTIONS.map((period, index) => {
            const isSelected = period === currentPeriod;
            return (
              <React.Fragment key={period}>
                <Pressable
                  onPress={() => onSelectPeriod(period)}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
                >
                  <ThemedText style={[styles.title, { color: ui.text }]}>
                    {formatBudgetPeriodLabel(period)}
                  </ThemedText>
                  {isSelected ? <Feather name="check" size={18} color={ui.text} /> : null}
                </Pressable>
                {index < BUDGET_PERIOD_OPTIONS.length - 1 ? (
                  <View style={[styles.separator, { backgroundColor: ui.border }]} />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  row: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
