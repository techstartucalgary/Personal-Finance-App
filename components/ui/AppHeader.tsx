import Feather from "@expo/vector-icons/Feather";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";
import { useTabsTheme } from "@/constants/tabsTheme";

type AppHeaderProps = {
  title: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  leftIcon?: React.ComponentProps<typeof Feather>["name"];
  rightIcon?: React.ComponentProps<typeof Feather>["name"] | null;
  titleStyle?: TextStyle;
};

export function AppHeader({
  title,
  onLeftPress,
  onRightPress,
  leftIcon = "bell",
  rightIcon = "user",
  titleStyle,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { ui } = useTabsTheme();
  const router = useRouter();
  const pathname = usePathname();
  const handleLeftPress =
    onLeftPress ??
    (() => {
      router.push({ pathname: "/notifications", params: { from: pathname } });
    });

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

      <ThemedText style={[styles.title, { color: ui.text }, titleStyle]}>
        {title}
      </ThemedText>

      {rightIcon === null ? (
        <View style={styles.iconButton} />
      ) : (
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
      )}
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
