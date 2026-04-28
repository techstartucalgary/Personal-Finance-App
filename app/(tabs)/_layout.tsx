import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { getColors } from "@/constants/authTokens";

export default function TabLayout() {
  const colors = getColors("light");

  return (
    <NativeTabs
      iconColor={{
        default: colors.muted,
        selected: colors.primaryBtn,
      }}
      labelStyle={{
        default: { color: colors.muted },
        selected: { color: colors.primaryBtn },
      }}
      indicatorColor="rgba(31, 31, 31, 0.08)"
      rippleColor="rgba(31, 31, 31, 0.05)"
      backgroundColor={colors.inputBg}
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
