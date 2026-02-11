export const Tokens = {
  font: {
    family: "Avenir LT Std",
    titleSize: 26,
    buttonSize: 16,
    bodySize: 16,
    weightSemi: "600" as const,
    weightBold: "700" as const,
  },
  space: {
    pageX: 28,
    section: 18,
    gap: 14,
  },
  radius: {
    pill: 999,
    card: 16,
  },
  size: {
    logo: 310,
    buttonH: 58,
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
      surface: "rgba(255,255,255,0.06)",
    };
  }

  return {
    bg: "#F8F8FFFC",
    text: "#020202",
    muted: "rgba(2,2,2,0.65)",
    line: "#020202",
    chipBorder: "rgba(2,2,2,0.28)",
    inputBg: "rgba(255,255,255,0.75)",
    danger: "#D64545",
    primaryBtn: "#1F1F1F",
    primaryText: "#FFFFFF",
    surface: "#FFFFFF",
  };
}
