import { getColors } from "@/constants/authTokens";

const base = getColors("light");

export const tabsTheme = {
  colors: base,
  ui: {
    bg: base.bg,
    surface: "#FFFFFF",
    surface2: "#F7F7FA",
    border: "rgba(2,2,2,0.12)",
    text: base.text,
    mutedText: base.muted,
    backdrop: "rgba(0,0,0,0.35)",
    accent: base.primaryBtn,
    accentSoft: "rgba(31,31,31,0.08)",
    hero: "#FFFFFF",
    heroAlt: "#F7F7FA",
    danger: base.danger,
    positive: base.primaryBtn,
    negative: base.danger,
  },
};

export type TabsUi = typeof tabsTheme.ui;
