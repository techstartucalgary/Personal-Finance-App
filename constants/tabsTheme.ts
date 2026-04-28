import { getColors } from "@/constants/authTokens";

const base = getColors("light");
const surface = base.surface;
const surface2 = "#E5E5EA";

export const tabsTheme = {
  colors: base,
  ui: {
    bg: base.bg,
    surface,
    surface2,
    border: base.line,
    text: base.text,
    mutedText: base.muted,
    backdrop: "rgba(34,34,37,0.18)",
    accent: base.primaryBtn,
    accentSoft: "rgba(17,17,17,0.08)",
    hero: surface,
    heroAlt: surface2,
    danger: base.danger,
    positive: "#4B4B51",
    negative: base.danger,
  },
};

export type TabsUi = typeof tabsTheme.ui;
