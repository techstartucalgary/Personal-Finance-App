import { useMemo } from "react";
import { Platform, useColorScheme } from "react-native";
import { useTheme } from "react-native-paper";

export function useThemeUI() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useTheme();
  const isAndroid = Platform.OS === "android";

  const ui = useMemo(
    () => ({
      bg: isAndroid ? theme.colors.background : (isDark ? "#000000" : "#F2F2F7"),
      surface: isAndroid ? theme.colors.surface : (isDark ? "#1C1C1E" : "#FFFFFF"), // neutral gray / white
      surface2: isDark ? "#2C2C2E" : "#F2F2F7",
      border: isAndroid ? theme.colors.outlineVariant : (isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)"),
      text: isDark ? "#FFFFFF" : "#000000",
      mutedText: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
      backdrop: "rgba(0,0,0,0.45)",
      accent: isAndroid ? (isDark ? "#8CF2D1" : "#1F6F5B") : (isDark ? "#8CF2D1" : "#1F6F5B"),
      accentSoft: isAndroid ? (isDark ? "rgba(140,242,209,0.15)" : "rgba(31,111,91,0.1)") : (isDark ? "rgba(140,242,209,0.2)" : "rgba(31,111,91,0.12)"),
      primaryText: isDark ? "#000000" : "#FFFFFF",
      hero: isDark ? "#2C2C2E" : "#FFFFFF",
      heroAlt: theme.colors.surfaceVariant,
      negative: isDark ? "#ff6b6b" : "#e03131",
      positive: isAndroid ? (isDark ? "#8CF2D1" : "#1F6F5B") : (isDark ? "#8CF2D1" : "#1F6F5B"),
      danger: isDark ? "#ff6b6b" : "#e03131", // added for backwards compatibility with tabsTheme.ui
      destructive: isAndroid ? theme.colors.error : (isDark ? "#FF453A" : "#FF3B30"),
      destructiveSoft: isDark ? "rgba(255, 69, 58, 0.15)" : "rgba(255, 59, 48, 0.12)",
    }),
    [isDark, theme, isAndroid],
  );

  return ui;
}
