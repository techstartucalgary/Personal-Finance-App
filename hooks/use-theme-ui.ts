import { getColors } from "@/constants/authTokens";
import { useMemo } from "react";
import { Platform } from "react-native";
import { useColorScheme } from "./use-color-scheme";

export function useThemeUI() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = getColors(scheme);
  const isAndroid = Platform.OS === "android";

  const ui = useMemo(
    () => ({
      bg: colors.bg,
      surface: colors.surface,
      surface2: isDark ? "#2C2C2E" : "#F2F2F7",
      border: colors.line,
      text: colors.text,
      mutedText: colors.muted,
      backdrop: "rgba(0,0,0,0.45)",
      accent: isDark ? "#8CF2D1" : "#1F6F5B",
      accentSoft: isDark ? "rgba(140,242,209,0.15)" : "rgba(31,111,91,0.1)",
      primaryText: isDark ? "#000000" : "#FFFFFF",
      hero: isDark ? "#2C2C2E" : "#FFFFFF",
      heroAlt: isDark ? "#3A3A3C" : "#E5E5EA",
      negative: isDark ? "#ff6b6b" : "#e03131",
      positive: isDark ? "#8CF2D1" : "#1F6F5B",
      danger: isDark ? "#ff6b6b" : "#e03131",
      destructive: isDark ? "#FF453A" : "#FF3B30",
      destructiveSoft: isDark ? "rgba(255, 69, 58, 0.15)" : "rgba(255, 59, 48, 0.12)",
    }),
    [colors, isDark, isAndroid],
  );

  return ui;
}
