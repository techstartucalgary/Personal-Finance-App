import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated } from "react-native";

import { tabsTheme } from "@/constants/tabsTheme";
import WalletIcon from "@/assets/images/Icons/bx-wallet.svg";
import SettingsIcon from "@/assets/images/Icons/settings.svg";
import HomeIcon from "@/assets/images/Icons/Iconly/Light-Outline/Iconly/Light-Outline/Home.svg";
import EditSquareIcon from "@/assets/images/Icons/Iconly/Light-Outline/Edit Square.svg";

type SvgIconProps = { width?: number; height?: number; style?: any };
type SvgIconComponent = React.ComponentType<SvgIconProps>;

function AnimatedTabIcon({
  Icon,
  focused,
  size,
}: {
  Icon: SvgIconComponent;
  focused: boolean;
  size: number;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: focused ? 1 : 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.35,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, opacity, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Icon width={size} height={size} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const ui = tabsTheme.ui;
  const insets = useSafeAreaInsets();
  const iconSize = 30;
  const bottomPadding = Math.max(insets.bottom, 24);
  const barHeight = 80 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: ui.bg,
          borderTopColor: "rgba(0,0,0,0.08)",
          borderTopWidth: 1,
          height: barHeight,
          paddingTop: 12,
          paddingBottom: bottomPadding,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon Icon={HomeIcon} focused={focused} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon Icon={WalletIcon} focused={focused} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon Icon={EditSquareIcon} focused={focused} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="targets"
        options={{
          title: "Targets",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon Icon={SettingsIcon} focused={focused} size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notification-settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
