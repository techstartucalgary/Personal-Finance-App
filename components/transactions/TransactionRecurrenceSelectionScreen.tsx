import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { PendingTransactionRecurrenceSelection } from "@/components/transactions/pending-transaction-recurrence-selection";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { parseLocalDate, toLocalISOString } from "@/utils/date";

type Ui = ReturnType<typeof useThemeUI>;
type RecurrenceFrequency = "Daily" | "Weekly" | "Monthly" | "Yearly";

type Props = PendingTransactionRecurrenceSelection & {
  onSelectRecurrence: (recurrence: PendingTransactionRecurrenceSelection) => void;
  uiOverride?: Ui;
};

const FREQUENCIES: RecurrenceFrequency[] = ["Daily", "Weekly", "Monthly", "Yearly"];

function defaultNextRunDate(frequency: string) {
  const nextDate = new Date();
  if (frequency === "Daily") nextDate.setDate(nextDate.getDate() + 1);
  else if (frequency === "Weekly") nextDate.setDate(nextDate.getDate() + 7);
  else if (frequency === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
  else if (frequency === "Yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
  return toLocalISOString(nextDate);
}

export function TransactionRecurrenceSelectionScreen({
  isRecurring,
  frequency,
  nextRunDate,
  hasEndDate,
  endDate,
  onSelectRecurrence,
  uiOverride,
}: Props) {
  const insets = useSafeAreaInsets();
  const themeUi = useThemeUI();
  const ui = uiOverride ?? themeUi;
  const [localIsRecurring, setLocalIsRecurring] = useState(isRecurring);
  const [localFrequency, setLocalFrequency] = useState(
    FREQUENCIES.includes(frequency as RecurrenceFrequency)
      ? frequency
      : "Monthly",
  );
  const [localNextRunDate, setLocalNextRunDate] = useState(
    nextRunDate || defaultNextRunDate(frequency || "Monthly"),
  );
  const [localHasEndDate, setLocalHasEndDate] = useState(hasEndDate);
  const [localEndDate, setLocalEndDate] = useState(
    endDate || nextRunDate || defaultNextRunDate(frequency || "Monthly"),
  );
  const onSelectRef = useRef(onSelectRecurrence);
  const recurrenceRef = useRef<PendingTransactionRecurrenceSelection>({
    isRecurring,
    frequency,
    nextRunDate,
    hasEndDate,
    endDate,
  });
  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E" || ui.bg === "#1B1B1E";

  useEffect(() => {
    onSelectRef.current = onSelectRecurrence;
  }, [onSelectRecurrence]);

  const summary = useMemo(() => {
    if (!localIsRecurring) return "This transaction will not repeat.";
    if (localHasEndDate) return `Repeats ${localFrequency.toLowerCase()} until ${localEndDate}.`;
    return `Repeats ${localFrequency.toLowerCase()} starting ${localNextRunDate}.`;
  }, [localEndDate, localFrequency, localHasEndDate, localIsRecurring, localNextRunDate]);

  const selectFrequency = (nextFrequency: RecurrenceFrequency) => {
    setLocalIsRecurring(true);
    setLocalFrequency(nextFrequency);
    setLocalNextRunDate(defaultNextRunDate(nextFrequency));
    if (!localHasEndDate) return;
    setLocalEndDate(defaultNextRunDate(nextFrequency));
  };

  useEffect(() => {
    recurrenceRef.current = {
      isRecurring: localIsRecurring,
      frequency: localFrequency,
      nextRunDate: localIsRecurring ? localNextRunDate : "",
      hasEndDate: localIsRecurring ? localHasEndDate : false,
      endDate: localIsRecurring && localHasEndDate ? localEndDate : "",
    };
  }, [
    localEndDate,
    localFrequency,
    localHasEndDate,
    localIsRecurring,
    localNextRunDate,
  ]);

  useEffect(() => {
    return () => {
      onSelectRef.current(recurrenceRef.current);
    };
  }, []);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>
            RECURRENCE
          </ThemedText>
        </View>

        <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
          <Pressable
            onPress={() => setLocalIsRecurring(false)}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
          >
            <View style={styles.rowLeading}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: !localIsRecurring ? ui.accentSoft : isDark ? ui.surface2 : "#F2F2F7" },
                ]}
              >
                <Feather
                  name="x"
                  size={17}
                  color={!localIsRecurring ? ui.accent : ui.mutedText}
                />
              </View>
              <View style={styles.copyWrap}>
                <ThemedText style={[styles.title, { color: ui.text }]}>Once</ThemedText>
                <ThemedText style={[styles.subtitle, { color: ui.mutedText }]}>
                  No recurring rule
                </ThemedText>
              </View>
            </View>
            {!localIsRecurring ? <IconSymbol name="checkmark" size={18} color={ui.accent} /> : null}
          </Pressable>

          <View style={[styles.separator, { backgroundColor: ui.border }]} />

          {FREQUENCIES.map((item, index) => {
            const isSelected = localIsRecurring && localFrequency === item;
            return (
              <React.Fragment key={item}>
                <Pressable
                  onPress={() => selectFrequency(item)}
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
                  {isSelected ? <IconSymbol name="checkmark" size={18} color={ui.accent} /> : null}
                </Pressable>
                {index < FREQUENCIES.length - 1 ? (
                  <View style={[styles.separator, { backgroundColor: ui.border }]} />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>

        {localIsRecurring ? (
          <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
            <DateTimePickerField
              label="Next Run"
              value={parseLocalDate(localNextRunDate)}
              onChange={(date) => setLocalNextRunDate(toLocalISOString(date))}
              ui={ui}
              icon="calendar.badge.clock"
            />
            <View style={[styles.separator, { backgroundColor: ui.border }]} />
            <View style={styles.row}>
              <View style={styles.rowLeading}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? ui.surface2 : "#F2F2F7" },
                  ]}
                >
                  <Feather name="calendar" size={17} color={ui.mutedText} />
                </View>
                <ThemedText style={[styles.title, { color: ui.text }]}>Ends</ThemedText>
              </View>
              <Switch
                value={localHasEndDate}
                onValueChange={(value) => {
                  setLocalHasEndDate(value);
                  if (value && !localEndDate) {
                    setLocalEndDate(localNextRunDate);
                  }
                }}
                trackColor={{ false: ui.border, true: "#34C759" }}
              />
            </View>
            {localHasEndDate ? (
              <>
                <View style={[styles.separator, { backgroundColor: ui.border }]} />
                <DateTimePickerField
                  label="Ends On"
                  value={parseLocalDate(localEndDate)}
                  onChange={(date) => setLocalEndDate(toLocalISOString(date))}
                  ui={ui}
                  icon="calendar"
                  placeholder="Select Date"
                />
              </>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.summaryCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
          <ThemedText style={[styles.summaryText, { color: ui.mutedText }]}>
            {summary}
          </ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { marginTop: 6 },
  sectionHeaderText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  groupCard: {
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
  copyWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  summaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
