import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/ui/AppHeader";
import { ThemedText } from "@/components/themed-text";
import { tabsTheme } from "@/constants/tabsTheme";
import { Tokens } from "@/constants/authTokens";

export default function NotificationsScreen() {
  const ui = tabsTheme.ui;
  const colors = tabsTheme.colors;
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;
  const [isNavigating, setIsNavigating] = useState(false);

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
    }, [fadeAnim, translateAnim])
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

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = insets.bottom + 60;
  }

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
            paddingBottom: tabBarHeight + 20,
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          },
        ]}
      >
        {/* TODO (backend): render notification list here.
            Show this empty state only when the list is empty. */}
        <View style={[styles.iconCircle, { backgroundColor: colors.inputBg }]}>
          <Feather name="bell" size={64} color={ui.surface} />
        </View>
        <ThemedText style={[styles.title, { color: ui.text }]}>
          You're all caught up
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: ui.mutedText }]}>
          New alerts for transactions, budgets, goals, and credit updates will appear here.
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
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
});
