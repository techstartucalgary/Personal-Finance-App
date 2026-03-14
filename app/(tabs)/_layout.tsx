import { Tabs } from "expo-router";
import React from "react";
import { Edit, Filter2, Home, Wallet } from "react-native-iconly";
import { useTheme } from "react-native-paper";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const tabBarIconColor = "#111111";
  const tabBarBg = "#FFFFFF";
  const tabBarBorder = "rgba(0, 0, 0, 0.12)";
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: tabBarIconColor,
        tabBarInactiveTintColor: tabBarIconColor,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: tabBarBorder,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
          paddingBottom: 12,
        },
      }}
    >
      <Tabs.Screen
    <NativeTabs
      tintColor={Colors[colorScheme ?? "light"].tint}
      indicatorColor={colorScheme === "dark" ? theme.colors.surfaceVariant : theme.colors.surfaceDisabled}
      backgroundColor={colorScheme === "dark" ? theme.colors.surface : theme.colors.surfaceVariant}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger
        name="dashboard"
        options={{
          title: "Dashboard",
        }}
      >
        <Icon
          sf="chart.pie"
          androidSrc={
            <VectorIcon
              family={Feather}
              name="pie-chart"
            />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color, size }) => (
            <Wallet set="light" primaryColor={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Home set="light" primaryColor={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size }) => (
            <Edit set="light" primaryColor={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="targets"
        options={{
          title: "Targets",
          tabBarIcon: ({ color, size }) => (
            <Filter2 set="light" primaryColor={color} size={size ?? 24} />
          ),
        }}
      />
    </Tabs>
  );
}
