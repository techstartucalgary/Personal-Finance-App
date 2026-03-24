import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { useTheme } from "react-native-paper";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <NativeTabs
      iconColor={{
        default: theme.colors.onSurfaceVariant,
        selected: Colors[colorScheme === 'dark' ? 'dark' : 'light'].tint
      }}
      labelStyle={{
        default: { color: theme.colors.onSurfaceVariant },
        selected: { color: Colors[colorScheme === 'dark' ? 'dark' : 'light'].tint }
      }}
      indicatorColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}
      rippleColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
      backgroundColor={colorScheme === "dark" ? theme.colors.surface : theme.colors.surfaceVariant}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.pie" md="pie_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="accounts">
        <NativeTabs.Trigger.Label>Accounts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="wallet.bifold" md="account_balance_wallet" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="format_list_bulleted" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="targets">
        <NativeTabs.Trigger.Label>Targets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="target" md="target" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
