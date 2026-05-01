import { useMemo } from "react";

import { getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function getTabsTheme(scheme: "light" | "dark") {
  const base = getColors(scheme);
  const isDark = scheme === "dark";
  const surface = base.surface;
  const surface2 = isDark ? "#2C2C2E" : "#E5E5EA";

  return {
    colors: base,
    ui: {
      bg: base.bg,
      surface,
      surface2,
      border: base.line,
      text: base.text,
      mutedText: base.muted,
      primaryText: base.primaryText,
      backdrop: isDark ? "rgba(0,0,0,0.45)" : "rgba(34,34,37,0.18)",
      accent: base.primaryBtn,
      accentSoft: isDark ? "rgba(255,255,255,0.12)" : "rgba(17,17,17,0.08)",
      hero: surface,
      heroAlt: surface2,
      danger: base.danger,
      positive: isDark ? "#8CF2D1" : "#4B4B51",
      negative: base.danger,
    },
  };
}

export function useTabsTheme() {
  const scheme = useColorScheme();

  return useMemo(() => getTabsTheme(scheme), [scheme]);
}

export const tabsTheme = getTabsTheme("light");

export type TabsTheme = ReturnType<typeof getTabsTheme>;
export type TabsUi = TabsTheme["ui"];
