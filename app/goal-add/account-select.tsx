import React, { useEffect } from "react";
import { Platform } from "react-native";

import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";

import { GoalAccountSelectionScreen } from "@/components/targets/goals/GoalAccountSelectionScreen";
import { setPendingGoalAccountSelection } from "@/components/targets/goals/pending-goal-account-selection";
import { tabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function GoalAddAccountSelectScreen() {
  const { session } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const ui = tabsTheme.ui;
  const userId = session?.user.id;
  const { currentAccountKey } = useLocalSearchParams<{
    currentAccountKey?: string;
  }>();

  useEffect(() => {
    navigation.setOptions({
      title: "Select Account",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
    });
  }, [navigation, ui.accent, ui.bg, ui.text]);

  return (
    <GoalAccountSelectionScreen
      currentAccountKey={currentAccountKey ?? null}
      userId={userId}
      onSelectAccount={(account) => {
        setPendingGoalAccountSelection(account);
        router.back();
      }}
    />
  );
}
