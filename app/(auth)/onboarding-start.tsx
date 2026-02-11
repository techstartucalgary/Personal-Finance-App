import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AuthButton } from "@/components/auth_buttons/auth-button";
import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function OnboardingStart() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);
  const { height, width } = useWindowDimensions();

  const compact = height < 760;
  const topPadding = compact ? 12 : 20;
  const heroSize = Math.max(compact ? 180 : 220, Math.min(width - 56, height * (compact ? 0.3 : 0.36)));
  const heroGap = compact ? 12 : 20;
  const textGap = compact ? 12 : 18;
  const bottomPad = compact ? 16 : 24;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.main, { paddingTop: topPadding, paddingBottom: bottomPad }]}>
        <Text style={[styles.brandTitle, { color: C.text }]}>Sterling</Text>

        <View style={[styles.heroBox, { height: heroSize }]}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={{ height: heroGap }} />

        <Text style={[styles.heading, { color: C.text }]}>Heading</Text>
        <Text style={[styles.copy, { color: C.text }]}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
          tempor incididunt ut labore et dolore magna aliqua.
        </Text>

        <View style={[styles.pager, { marginTop: textGap }]}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <View style={styles.actions}>
          <AuthButton
            label="Sign Up"
            variant="outline"
            onPress={() => router.push("/(auth)/signup")}
          />
          <AuthButton
            label="Log In"
            variant="primary"
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const T = Tokens;

const styles = StyleSheet.create({
  screen: { flex: 1 },

  main: {
    flexGrow: 1,
    paddingHorizontal: T.space.pageX,
  },

  brandTitle: {
    fontFamily: T.font.family,
    fontSize: T.font.titleSize,
    fontWeight: T.font.weightBold,
    textAlign: "center",
    marginBottom: 26,
  },

  heroBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(2,2,2,0.65)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    backgroundColor: "rgba(0,0,0,0.02)",
  },

  heroImage: {
    width: "85%",
    height: "85%",
  },

  heading: {
    fontFamily: T.font.family,
    fontSize: T.font.subtitleSize,
    fontWeight: T.font.weightBold,
    textAlign: "center",
    marginBottom: 12,
  },

  copy: {
    fontFamily: T.font.inputFamily,
    fontSize: T.font.bodySize,
    lineHeight: 24,
    textAlign: "center",
    color: "rgba(2,2,2,0.9)",
    paddingHorizontal: 10,
  },

  pager: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 26,
  },

  dot: {
    width: 42,
    height: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    backgroundColor: "transparent",
  },

  dotActive: {
    backgroundColor: "#1F1F1F",
  },

  actions: {
    gap: 14,
    marginTop: "auto",
  },
});
