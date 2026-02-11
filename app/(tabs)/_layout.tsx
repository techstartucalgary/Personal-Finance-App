import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Icon,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import React from "react";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs
      tintColor={Colors[colorScheme ?? "light"].tint}
      indicatorColor={colorScheme === "dark" ? "#454548ff" : "#E5E7EB"}
      backgroundColor={colorScheme === "dark" ? "#202324" : "#F9FAFB"}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger
        name="index"
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
