import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/ui/AppHeader";
import { ThemedText } from "@/components/themed-text";
import { tabsTheme } from "@/constants/tabsTheme";
import { Tokens } from "@/constants/authTokens";
import { useAuthContext } from "@/hooks/use-auth-context";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type NotificationRecord,
} from "@/utils/notifications";

export default function NotificationsScreen() {
  const ui = tabsTheme.ui;
  const colors = tabsTheme.colors;
  const router = useRouter();
  const { session } = useAuthContext();
  const userId = session?.user.id;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const loadNotifications = useCallback(
    async (refresh = false) => {
      if (!userId) {
        setNotifications([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const rows = await listNotifications({ profile_id: userId });
        setNotifications(rows);
      } catch (error) {
        console.error("Error loading notifications:", error);
        Alert.alert(
          "Couldn't load notifications",
          "Please try again in a moment.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      translateAnim.setValue(8);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      void loadNotifications();

      if (!userId) return;

      return subscribeToNotifications({
        profile_id: userId,
        onChange: () => {
          void loadNotifications(true);
        },
      });
    }, [fadeAnim, loadNotifications, translateAnim, userId]),
  );

  const returnTo = useMemo(() => {
    if (typeof from !== "string") return "";
    if (!from.startsWith("/")) return "";
    return from;
  }, [from]);

  const handleClose = useCallback(() => {
    if (returnTo) {
      router.replace(returnTo);
      return;
    }
    router.back();
  }, [returnTo, router]);

  const handleOpenSettings = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.92,
        duration: 160,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: -6,
        duration: 160,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push({
        pathname: "/notification-settings",
        params: {
          animate: "1",
          ...(returnTo ? { from: returnTo } : {}),
        },
      });
      setIsNavigating(false);
    });
  }, [fadeAnim, translateAnim, isNavigating, router, returnTo]);

  const handleOpenNotification = useCallback(
    async (item: NotificationRecord) => {
      if (!userId) return;

      try {
        if (!item.is_read) {
          await markNotificationRead({ id: item.id, profile_id: userId });
          setNotifications((prev) =>
            prev.map((notification) =>
              notification.id === item.id
                ? {
                    ...notification,
                    is_read: true,
                    read_at: new Date().toISOString(),
                  }
                : notification,
            ),
          );
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }

      if (!item.route_pathname) return;

      const params = Object.fromEntries(
        Object.entries(item.route_params ?? {}).map(([key, value]) => [
          key,
          String(value),
        ]),
      );

      router.push({
        pathname: item.route_pathname as never,
        params: params as never,
      });
    },
    [router, userId],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!userId || isMarkingAll) return;

    setIsMarkingAll(true);

    try {
      await markAllNotificationsRead({ profile_id: userId });
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      Alert.alert(
        "Couldn't update notifications",
        "Please try again in a moment.",
      );
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll, userId]);

  const tabBarHeight = insets.bottom + 60;
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <View style={[styles.screen, { backgroundColor: ui.bg }]}>
      <AppHeader
        title="Notifications"
        leftIcon="x"
        rightIcon="settings"
        onLeftPress={handleClose}
        onRightPress={handleOpenSettings}
        titleStyle={{
          fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
          fontSize: 21,
        }}
      />
      <Animated.View
        style={[
          styles.body,
          {
            paddingBottom: tabBarHeight + 12,
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          },
        ]}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={ui.text} />
            <ThemedText style={[styles.loadingText, { color: ui.mutedText }]}>
              Loading notifications...
            </ThemedText>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View
              style={[styles.iconCircle, { backgroundColor: colors.inputBg }]}
            >
              <Feather name="bell" size={64} color={ui.surface} />
            </View>
            <ThemedText style={[styles.title, { color: ui.text }]}>
              {"You're all caught up"}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: ui.mutedText }]}>
              New alerts for transactions, budgets, goals, and credit updates
              will appear here.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  void loadNotifications(true);
                }}
                tintColor={ui.text}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: ui.surface, borderColor: ui.border },
                ]}
              >
                <View style={styles.summaryTextWrap}>
                  <ThemedText style={[styles.summaryTitle, { color: ui.text }]}>
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${
                          unreadCount === 1 ? "" : "s"
                        }`
                      : "All notifications read"}
                  </ThemedText>
                  <ThemedText
                    style={[styles.summarySubtitle, { color: ui.mutedText }]}
                  >
                    Alerts update in real time when supported events are saved.
                  </ThemedText>
                </View>
                {unreadCount > 0 && (
                  <Pressable
                    onPress={() => {
                      void handleMarkAllRead();
                    }}
                    style={({ pressed }) => [
                      styles.markAllButton,
                      {
                        backgroundColor: ui.surface2 ?? ui.surface,
                        borderColor: ui.border,
                        opacity: pressed || isMarkingAll ? 0.7 : 1,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.markAllText, { color: ui.text }]}
                    >
                      {isMarkingAll ? "Marking..." : "Mark all read"}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  void handleOpenNotification(item);
                }}
                style={({ pressed }) => [
                  styles.notificationCard,
                  {
                    backgroundColor: item.is_read ? ui.surface : ui.surface2,
                    borderColor: item.is_read ? ui.border : ui.text,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <View style={styles.notificationTopRow}>
                  <View style={styles.notificationHeadingWrap}>
                    <ThemedText
                      style={[styles.notificationTitle, { color: ui.text }]}
                    >
                      {item.title}
                    </ThemedText>
                    <ThemedText
                      style={[styles.notificationTime, { color: ui.mutedText }]}
                    >
                      {formatRelativeTime(item.created_at)}
                    </ThemedText>
                  </View>
                  {!item.is_read && (
                    <View
                      style={[styles.unreadDot, { backgroundColor: ui.text }]}
                    />
                  )}
                </View>
                <ThemedText
                  style={[styles.notificationBody, { color: ui.mutedText }]}
                >
                  {item.body}
                </ThemedText>
              </Pressable>
            )}
          />
        )}
      </Animated.View>
    </View>
  );
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const absMinutes = Math.abs(diffMinutes);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absMinutes < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, "day");
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Tokens.font.family,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Tokens.font.family,
    maxWidth: 260,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  summaryTextWrap: {
    gap: 4,
  },
  summaryTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  summarySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Tokens.font.family,
  },
  markAllButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  markAllText: {
    fontSize: 13,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  notificationCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  notificationTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  notificationHeadingWrap: {
    flex: 1,
    gap: 3,
  },
  notificationTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  notificationTime: {
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: Tokens.font.family,
  },
  notificationBody: {
    fontSize: 14.5,
    lineHeight: 21,
    fontFamily: Tokens.font.family,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
});
