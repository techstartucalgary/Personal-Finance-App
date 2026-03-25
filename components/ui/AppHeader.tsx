import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tabsTheme } from "@/constants/tabsTheme";
import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";

type AppHeaderProps = {
  title: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  leftIcon?: React.ComponentProps<typeof Feather>["name"];
  rightIcon?: React.ComponentProps<typeof Feather>["name"];
};

export function AppHeader({
  title,
  onLeftPress,
  onRightPress,
  leftIcon = "bell",
  rightIcon = "user",
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const ui = tabsTheme.ui;
  const handleLeftPress =
    onLeftPress ?? (() => Alert.alert("Notifications", "You have no new notifications."));

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14, backgroundColor: ui.bg }]}>
      <Pressable
        onPress={handleLeftPress}
        hitSlop={10}
        style={({ pressed }) => [
          styles.iconButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name={leftIcon} size={24} color={ui.text} />
      </Pressable>

      <ThemedText style={[styles.title, { color: ui.text }]}>{title}</ThemedText>

      <Pressable
        onPress={onRightPress}
        hitSlop={10}
        disabled={!onRightPress}
        style={({ pressed }) => [
          styles.iconButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name={rightIcon} size={24} color={ui.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 0.2,
    fontFamily: Tokens.font.headingFamily ?? Tokens.font.boldFamily,
  },
});
