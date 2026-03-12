import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Icon,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import React from "react";
import { useTheme } from "react-native-paper";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <NativeTabs
      tintColor={Colors[colorScheme ?? "light"].tint}
      indicatorColor={theme.colors.secondaryContainer}
      backgroundColor={theme.colors.elevation.level2}
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
        }}
      >
        <Icon
          sf="wallet.bifold"
          androidSrc={
            <VectorIcon
              family={MaterialIcons}
              name="wallet"
            />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="transactions"
        options={{
          title: "Transactions",
        }}
      >
        <Icon
          sf="list.bullet"
          androidSrc={
            <VectorIcon
              family={Feather}
              name="list"
            />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="targets"
        options={{
          title: "Targets",
        }}
      >
        <Icon
          sf="target"
          androidSrc={
            <VectorIcon
              family={Feather}
              name="target"
            />
          }
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
