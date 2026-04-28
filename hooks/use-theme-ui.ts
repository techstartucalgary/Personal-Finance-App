import { useMemo } from "react";

import { getColors } from "@/constants/authTokens";

export function useThemeUI() {
  const isDark = false;
  const colors = getColors("light");

  const ui = useMemo(
    () => ({
      bg: colors.bg,
      surface: colors.surface,
      surface2: isDark ? "#2C2C2E" : "#F2F2F7",
      border: colors.line,
      text: colors.text,
      mutedText: colors.muted,
      backdrop: "rgba(0,0,0,0.45)",
      accent: colors.primaryBtn,
      accentSoft: isDark ? "rgba(255,255,255,0.12)" : "rgba(17,17,17,0.08)",
      hero: colors.surface,
      heroAlt: isDark ? "#2C2C2E" : "#E5E5EA",
      negative: colors.danger,
      positive: isDark ? "#E5E5EA" : "#4B4B51",
      danger: colors.danger,
      destructive: colors.danger,
    }),
    [colors],
  );

  return ui;
}
