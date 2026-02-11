export const Tokens = {
  font: {
    family: "Avenir LT Std",
    headingFamily: "Avenir LT Std",
    inputFamily: "Nunito Sans",
    titleSize: 34,
    subtitleSize: 22,
    buttonSize: 24,
    bodySize: 18,
    helperSize: 16,
    weightSemi: "600" as const,
    weightBold: "700" as const,
  },
  space: {
    pageX: 26,
    section: 20,
    gap: 16,
  },
  radius: {
    pill: 999,
    card: 10,
  },
  size: {
    logo: 280,
    buttonH: 64,
    inputH: 74,
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
    bg: "#ECECF1",
    text: "#222225",
    muted: "#5C5C60",
    line: "#020202",
    chipBorder: "rgba(2,2,2,0.25)",
    inputBg: "#D7D7D9",
    danger: "#EF4444",
    primaryBtn: "#1F1F1F",
    primaryText: "#F4F4F4",
    surface: "#ECECF1",
  };
}
