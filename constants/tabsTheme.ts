import { getColors } from "@/constants/authTokens";

const base = getColors("light");
const surface = "#F6F6F8";
const surface2 = "#E1E1E1";

export const tabsTheme = {
  colors: base,
  ui: {
    bg: base.bg,
    surface,
    surface2,
    border: "rgba(2,2,2,0.1)",
    text: base.text,
    mutedText: base.muted,
    backdrop: "rgba(34,34,37,0.18)",
    accent: base.primaryBtn,
    accentSoft: "rgba(31,31,31,0.08)",
    hero: surface,
    heroAlt: surface2,
    danger: base.danger,
    positive: "#4B4B51",
    negative: "#701D26",
  },
};

export type TabsUi = typeof tabsTheme.ui;
