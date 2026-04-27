import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/ui/AppHeader";
import { ThemedText } from "@/components/themed-text";
import {
  NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_DEFAULTS,
  type NotificationPreferenceDefinition,
  type NotificationPreferenceKey,
  type NotificationSectionTitle,
} from "@/constants/notificationPreferences";
import { tabsTheme } from "@/constants/tabsTheme";
import { Tokens } from "@/constants/authTokens";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  subscribeToNotificationPreferences,
  syncNotificationPreferences,
  updateNotificationPreference,
} from "@/utils/notifications";

type Section = {
  title: NotificationSectionTitle;
  items: NotificationPreferenceDefinition[];
};

type ToggleState = Record<NotificationPreferenceKey, boolean>;

const PREFERENCE_BY_ID = Object.fromEntries(
  NOTIFICATION_PREFERENCES.map((item) => [item.id, item]),
) as Record<string, NotificationPreferenceDefinition>;

const EMPTY_SAVING_STATE = {} as Record<NotificationPreferenceKey, boolean>;

export default function NotificationSettingsScreen() {
  const ui = tabsTheme.ui;
  const router = useRouter();
  const { animate } = useLocalSearchParams<{ animate?: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();
  const userId = session?.user.id;

  const tabBarHeight = insets.bottom + 60;

  const sections = useMemo<Section[]>(
    () =>
      ["Transactions", "Budget", "Goals", "Credit", "Rewards"].map((title) => ({
        title: title as NotificationSectionTitle,
        items: NOTIFICATION_PREFERENCES.filter((item) => item.section === title),
      })),
    [],
  );

  const [toggles, setToggles] = useState<ToggleState>(
    NOTIFICATION_PREFERENCE_DEFAULTS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState(EMPTY_SAVING_STATE);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const shouldAnimate = animate === "1";
  const hasAnimated = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;

  const loadPreferences = useCallback(async () => {
    if (!userId) {
      setToggles(NOTIFICATION_PREFERENCE_DEFAULTS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const rows = await syncNotificationPreferences({ profile_id: userId });
      const nextState: ToggleState = { ...NOTIFICATION_PREFERENCE_DEFAULTS };

      for (const row of rows) {
        const definition = PREFERENCE_BY_ID[row.preference_id];
        if (!definition) continue;
        nextState[definition.key] = row.enabled;
      }

      setToggles(nextState);
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      Alert.alert(
        "Couldn't load notification settings",
        "Please try again in a moment.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleToggle = useCallback(
    async (item: NotificationPreferenceDefinition, value: boolean) => {
      if (!userId) return;

      const previousValue = toggles[item.key];

      setToggles((prev) => ({ ...prev, [item.key]: value }));
      setSavingKeys((prev) => ({ ...prev, [item.key]: true }));

      try {
        await updateNotificationPreference({
          profile_id: userId,
          preference_id: item.id,
          enabled: value,
        });
      } catch (error) {
        console.error("Error updating notification preference:", error);
        setToggles((prev) => ({ ...prev, [item.key]: previousValue }));
        Alert.alert(
          "Couldn't save that setting",
          "Your notification preference was restored.",
        );
      } finally {
        setSavingKeys((prev) => {
          const next = { ...prev };
          delete next[item.key];
          return next;
        });
      }
    },
    [toggles, userId],
  );

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

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (!userId) return;

    return subscribeToNotificationPreferences({
      profile_id: userId,
      onChange: () => {
        void loadPreferences();
      },
    });
  }, [loadPreferences, userId]);

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
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={ui.text} />
            <ThemedText style={[styles.loadingText, { color: ui.mutedText }]}>
              Loading your notification settings...
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.container}
            onLayout={(event) =>
              setContainerHeight(event.nativeEvent.layout.height)
            }
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
            <ThemedText style={[styles.helperText, { color: ui.mutedText }]}>
              Alerts are saved to your account and generated automatically when
              qualifying transactions, budgets, and goals change.
            </ThemedText>

            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <ThemedText
                  style={[styles.sectionTitle, { color: ui.mutedText }]}
                >
                  {section.title}
                </ThemedText>

                <View
                  style={[
                    styles.groupCard,
                    { backgroundColor: ui.surface, borderColor: ui.border },
                  ]}
                >
                  {section.items.map((item, index) => {
                    const isSaving = Boolean(savingKeys[item.key]);

                    return (
                      <View key={item.key}>
                        <View style={styles.row}>
                          <View style={styles.rowTextWrap}>
                            <ThemedText
                              style={[styles.rowLabel, { color: ui.text }]}
                            >
                              {item.label}
                            </ThemedText>
                            {!item.implemented && (
                              <ThemedText
                                style={[
                                  styles.rowMeta,
                                  { color: ui.mutedText },
                                ]}
                              >
                                Source integration coming later
                              </ThemedText>
                            )}
                          </View>
                          <Switch
                            value={toggles[item.key]}
                            onValueChange={(value) => {
                              void handleToggle(item, value);
                            }}
                            disabled={isSaving}
                            trackColor={{ false: ui.border, true: "#34C759" }}
                            thumbColor="#FFFFFF"
                            ios_backgroundColor={ui.border}
                            style={styles.switch}
                          />
                        </View>
                        {index < section.items.length - 1 && (
                          <View
                            style={[
                              styles.divider,
                              { backgroundColor: ui.border },
                            ]}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
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
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Tokens.font.family,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Tokens.font.family,
    marginHorizontal: 4,
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
    minHeight: 60,
    gap: 12,
  },
  rowTextWrap: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: 15.5,
    lineHeight: 20,
    fontFamily: Tokens.font.family,
  },
  rowMeta: {
    fontSize: 12.5,
    lineHeight: 17,
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
