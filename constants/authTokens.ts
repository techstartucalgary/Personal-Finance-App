// constants/authTokens.ts
export const Tokens = {
  font: {
    family: "System",
    titleSize: 22,
    buttonSize: 14,
    bodySize: 14,
    weightSemi: "600" as const,
    weightBold: "700" as const,
  },
  space: {
    pageX: 28,
    section: 18,
    gap: 12,
  },
  radius: {
    pill: 999,
    card: 16,
  },
  size: {
    logo: 220,
    buttonH: 54,
  },
};

export function getColors(scheme: "light" | "dark") {
  if (scheme === "dark") {
    return {
      bg: "#1B1717",
      text: "#FFFFFF",
      muted: "rgba(255,255,255,0.65)",
      line: "rgba(255,255,255,0.25)",
      chipBorder: "rgba(255,255,255,0.35)",
      inputBg: "#3A3434",
      danger: "#E35B5B",
      primaryBtn: "#E1BB80",
      primaryText: "#1B1717",
    };
  }

  return {
    bg: "#F4F5F8",
    text: "#111111",
    muted: "rgba(0,0,0,0.55)",
    line: "rgba(0,0,0,0.18)",
    chipBorder: "rgba(0,0,0,0.20)",
    inputBg: "#E7E7EA",
    danger: "#D64545",
    primaryBtn: "#1F1F1F",
    primaryText: "#FFFFFF",
  };
}
