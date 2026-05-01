export const Tokens = {
  font: {
    family: "Lato-Regular",
    headingFamily: "Lato-Bold",
    inputFamily: "Lato-Regular",
    semiFamily: "Lato-Bold",
    boldFamily: "Lato-Bold",
    obliqueFamily: "Lato-Italic",
    numberFamily: "Lato-Bold",
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
      bg: "#000000",
      text: "#FFFFFF",
      muted: "rgba(235,235,245,0.6)",
      line: "rgba(84,84,88,0.65)",
      chipBorder: "rgba(84,84,88,0.8)",
      inputBg: "#1C1C1E",
      danger: "#FF6B6B",
      primaryBtn: "#FFFFFF",
      primaryText: "#111111",
      surface: "#1C1C1E",
    };
  }

  return {
    bg: "#F2F2F7",
    text: "#111111",
    muted: "rgba(60,60,67,0.65)",
    line: "rgba(60,60,67,0.18)",
    chipBorder: "rgba(60,60,67,0.22)",
    inputBg: "#FFFFFF",
    danger: "#C65B5B",
    primaryBtn: "#111111",
    primaryText: "#FFFFFF",
    surface: "#FFFFFF",
  };
}
