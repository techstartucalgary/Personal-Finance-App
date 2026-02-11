import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function OrDivider() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: C.line }]} />
      <Text style={[styles.text, { color: C.line }]}>OR</Text>
      <View style={[styles.line, { backgroundColor: C.line }]} />
    </View>
  );
}

const T = Tokens;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginVertical: 18,
  },
  line: {
    height: 2,
    width: 130,
    borderRadius: 2,
  },
  text: {
    fontFamily: T.font.family,
    fontSize: 16,
    fontWeight: T.font.weightBold,
    letterSpacing: 1.2,
  },
});
