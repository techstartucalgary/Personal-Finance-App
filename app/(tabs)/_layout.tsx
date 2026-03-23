import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
      tintColor={Colors[colorScheme === 'dark' ? 'dark' : 'light'].tint}
      indicatorColor={colorScheme === "dark" ? theme.colors.surfaceVariant : theme.colors.surfaceDisabled}
      backgroundColor={colorScheme === "dark" ? theme.colors.surface : theme.colors.surfaceVariant}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.pie"
          src={<NativeTabs.Trigger.VectorIcon family={Feather} name="pie-chart" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="accounts">
        <NativeTabs.Trigger.Label>Accounts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="wallet.bifold"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="wallet" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="list.bullet"
          src={<NativeTabs.Trigger.VectorIcon family={Feather} name="list" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="targets">
        <NativeTabs.Trigger.Label>Targets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="target"
          src={<NativeTabs.Trigger.VectorIcon family={Feather} name="target" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
