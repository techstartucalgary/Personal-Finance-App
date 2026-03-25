import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Icon,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import React from "react";

import { tabsTheme } from "@/constants/tabsTheme";

export default function TabLayout() {
  const ui = tabsTheme.ui;
  const colors = tabsTheme.colors;

  return (
    <NativeTabs
      tintColor={colors.primaryBtn}
      indicatorColor={ui.border}
      backgroundColor={ui.bg}
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
