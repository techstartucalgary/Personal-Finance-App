import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  type RecurrenceFrequency,
  setPendingRecurrenceFrequencySelection,
} from "@/components/transactions/pending-recurrence-frequency-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";

const FREQUENCIES: RecurrenceFrequency[] = ["Daily", "Weekly", "Monthly", "Yearly"];

function getFrequency(value?: string): RecurrenceFrequency {
  return FREQUENCIES.includes(value as RecurrenceFrequency)
    ? (value as RecurrenceFrequency)
    : "Monthly";
}

export default function RecurrenceFrequencySelectScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const ui = useThemeUI();
  const { frequency } = useLocalSearchParams<{ frequency?: string }>();
  const currentFrequency = getFrequency(frequency);
  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E" || ui.bg === "#1B1B1E";

  useEffect(() => {
    navigation.setOptions({
      title: "Select Frequency",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
    });
  }, [navigation, ui.accent, ui.bg, ui.text]);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>
            RECURRENCE
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: ui.surface, borderColor: ui.border }]}>
          {FREQUENCIES.map((item, index) => {
            const isSelected = item === currentFrequency;
            return (
              <React.Fragment key={item}>
                <Pressable
                  onPress={() => {
                    setPendingRecurrenceFrequencySelection(item);
                    router.back();
                  }}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
                >
                  <View style={styles.rowLeading}>
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: isSelected
                            ? ui.accentSoft
                            : isDark
                              ? ui.surface2
                              : "#F2F2F7",
                        },
                      ]}
                    >
                      <Feather
                        name="repeat"
                        size={17}
                        color={isSelected ? ui.accent : ui.mutedText}
                      />
                    </View>
                    <ThemedText style={[styles.title, { color: ui.text }]}>
                      {item}
                    </ThemedText>
                  </View>
                  {isSelected ? <Feather name="check" size={18} color={ui.accent} /> : null}
                </Pressable>
                {index < FREQUENCIES.length - 1 ? (
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
    gap: 14,
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
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
});
