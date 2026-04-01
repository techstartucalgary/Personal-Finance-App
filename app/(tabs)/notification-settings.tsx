import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, InteractionManager, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/ui/AppHeader";
import { ThemedText } from "@/components/themed-text";
import { tabsTheme } from "@/constants/tabsTheme";
import { Tokens } from "@/constants/authTokens";

type ToggleKey =
  | "deposit"
  | "expense"
  | "unusual"
  | "review"
  | "budget"
  | "budgetNear"
  | "milestones"
  | "offTrack"
  | "checkin"
  | "credit"
  | "creditUtil"
  | "referral";

type Section = {
  title: string;
  items: Array<{ key: ToggleKey; label: string }>;
};

// Backend mapping guide:
// - Keep ToggleKey stable and use preferenceIds to map to backend fields.
// - When backend is ready, replace local state with fetched preferences.
const preferenceIds: Record<ToggleKey, string> = {
  deposit: "notifications.transactions.deposit_posted",
  expense: "notifications.transactions.large_expense",
  unusual: "notifications.transactions.unusual_activity",
  review: "notifications.transactions.needs_review",
  budget: "notifications.budget.exceeded",
  budgetNear: "notifications.budget.near_limit",
  milestones: "notifications.goals.milestone_reached",
  offTrack: "notifications.goals.off_track",
  checkin: "notifications.goals.balance_checkin",
  credit: "notifications.other.credit_score_change",
  creditUtil: "notifications.other.credit_utilization_high",
  referral: "notifications.other.referral_credits",
};

export default function NotificationSettingsScreen() {
  const ui = tabsTheme.ui;
  const router = useRouter();
  const { animate } = useLocalSearchParams<{ animate?: string }>();
  const insets = useSafeAreaInsets();

  const tabBarHeight = insets.bottom + 60;

  const sections = useMemo<Section[]>(
    () => [
      {
        title: "Transactions",
        items: [
          { key: "deposit", label: "Deposits posted" },
          { key: "expense", label: "Large expenses" },
          { key: "unusual", label: "Unusual activity" },
          { key: "review", label: "Transactions needing review" },
        ],
      },
      {
        title: "Budget",
        items: [
          { key: "budget", label: "Budget exceeded" },
          { key: "budgetNear", label: "Budget nearing limit" },
        ],
      },
      {
        title: "Goals",
        items: [
          { key: "milestones", label: "Milestone reached" },
          { key: "offTrack", label: "Goal off track" },
          { key: "checkin", label: "Balance check-in" },
        ],
      },
      {
        title: "Credit",
        items: [
          { key: "credit", label: "Credit score changes" },
          { key: "creditUtil", label: "High credit utilization" },
        ],
      },
      {
        title: "Rewards",
        items: [{ key: "referral", label: "Referral credits earned" }],
      },
    ],
    []
  );

  // Local defaults. Replace with backend values once wired.
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    deposit: false,
    expense: false,
    unusual: false,
    review: false,
    budget: false,
    budgetNear: false,
    milestones: false,
    offTrack: false,
    checkin: false,
    credit: false,
    creditUtil: false,
    referral: false,
  });
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const shouldAnimate = animate === "1";
  const hasAnimated = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;

  const handleToggle = (key: ToggleKey, value: boolean) => {
    setToggles((prev) => ({ ...prev, [key]: value }));
    // TODO (backend): persist toggle to API.
    // Example payload:
    // {
    //   preference_id: preferenceIds[key],
    //   enabled: value,
    // }
  };

  const topPadding = 14;
  const bottomPadding = tabBarHeight + 40;
  const shouldScroll = contentHeight - bottomPadding > containerHeight + 1;

  useEffect(() => {
    if (!shouldAnimate || hasAnimated.current) {
      fadeAnim.setValue(1);
      translateAnim.setValue(0);
      return;
    }

    hasAnimated.current = true;
    // Subtle entrance after navigation finishes to avoid flicker.
    fadeAnim.setValue(0.92);
    translateAnim.setValue(6);
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => task.cancel();
  }, [fadeAnim, shouldAnimate, translateAnim]);

  return (
    <View style={[styles.screen, { backgroundColor: ui.bg }]}>
      <AppHeader
        title="Notifications"
        leftIcon="arrow-left"
        rightIcon={null}
        onLeftPress={() => {
          router.back();
        }}
        titleStyle={{
          fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
          fontSize: 21,
        }}
      />
      <Animated.View
        style={[
          styles.bodyWrap,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.container}
          onLayout={(event) => setContainerHeight(event.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContentHeight(height)}
          scrollEnabled={shouldScroll}
          bounces={shouldScroll}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: topPadding, paddingBottom: bottomPadding },
          ]}
        >
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: ui.mutedText }]}>
                {section.title}
              </ThemedText>

              <View style={[styles.groupCard, { backgroundColor: ui.surface, borderColor: ui.border }]}>
                {section.items.map((item, index) => (
                  <View key={item.key}>
                    <View style={styles.row}>
                      <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                        {item.label}
                      </ThemedText>
                      <Switch
                        value={toggles[item.key]}
                        onValueChange={(value) => handleToggle(item.key, value)}
                        trackColor={{ false: ui.border, true: "#34C759" }}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor={ui.border}
                        style={styles.switch}
                      />
                    </View>
                    {index < section.items.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: ui.border }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bodyWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 52,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15.5,
    lineHeight: 20,
    fontFamily: Tokens.font.family,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  switch: {
    transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }],
  },
});
