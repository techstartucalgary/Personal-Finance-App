import { Tabs } from "expo-router";
import React from "react";
import { Edit, Filter2, Home, Wallet } from "react-native-iconly";

export default function TabLayout() {
  const tabBarIconColor = "#111111";
  const tabBarBg = "#FFFFFF";
  const tabBarBorder = "rgba(0, 0, 0, 0.12)";

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
