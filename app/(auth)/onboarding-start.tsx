import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AuthButton } from "@/components/auth_buttons/auth-button";
import { getColors, Tokens } from "@/constants/authTokens";
import { supabase } from "@/utils/supabase";

export default function OnboardingStart() {
  const C = getColors("light");
  const { height, width } = useWindowDimensions();
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const compact = height < 760 || width < 370;
  const horizontalPad = compact ? 20 : 26;
  const topPadding = (compact ? 0 : 4) + insets.top;
  const bottomPad = 0;
  const cardWidth = width - horizontalPad * 2;
  const sectionHeight = compact ? 138 : 156;
  const textGap = compact ? 6 : 10;
  const buttonHeight = compact ? 48 : 50;
  const dotsGap = compact ? -6 : -8;
  const actionsGap = compact ? 6 : 8;

  const heroMin = compact ? 140 : 170;
  const heroMax = compact ? 220 : 280;
  const reserved =
    topPadding +
    bottomPad +
    (compact ? 44 : 50) +
    textGap +
    sectionHeight +
    dotsGap +
    8 +
    actionsGap +
    (buttonHeight * 2 + 10);
  const available = height - reserved;
  const heroSize = Math.min(
    width - horizontalPad * 2,
    heroMax,
    Math.max(heroMin, available),
  );

  const slides = [
    {
      title: "See Every Dollar Clearly",
      body: "Sterling gives you one place to track spending, balances, and monthly cash flow without the clutter.",
    },
    {
      title: "Build Smarter Budgets",
      body: "Set practical category budgets, spot overspending early, and adjust your plan before the month gets away from you.",
    },
    {
      title: "Stay Focused on Goals",
      body: "Turn your financial targets into progress you can see so saving for short and long term goals feels simple and consistent.",
    },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.main,
            {
              paddingTop: topPadding,
              paddingBottom: bottomPad,
              paddingHorizontal: horizontalPad,
            },
          ]}
        >
          <Text style={[styles.brandTitle, { color: "#000000" }]}>
            Sterling
          </Text>

          <View style={[styles.heroBox, { height: heroSize }]}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          <View style={{ height: textGap }} />

          <View style={[styles.infoSection, { height: sectionHeight }]}>
            <Animated.ScrollView
              horizontal
              pagingEnabled
              snapToInterval={cardWidth}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false },
              )}
              scrollEventThrottle={16}
              contentContainerStyle={styles.slideTrack}
            >
              {slides.map((slide) => (
                <View
                  key={slide.title}
                  style={[styles.slide, { width: cardWidth }]}
                >
                  <Text style={[styles.heading, { color: "#000000" }]}>
                    {slide.title}
                  </Text>
                  <Text style={[styles.copy, { color: C.muted }]}>
                    {slide.body}
                  </Text>
                </View>
              ))}
            </Animated.ScrollView>

            <View style={[styles.pager, { marginTop: dotsGap }]}>
              {slides.map((slide, index) => {
                const inputRange = slides.map((_, idx) => idx * cardWidth);
                const widthRange = inputRange.map((_, idx) =>
                  idx === index ? 18 : 8,
                );
                const opacityRange = inputRange.map((_, idx) =>
                  idx === index ? 1 : 0.3,
                );

                return (
                  <Animated.View
                    key={slide.title}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: C.text,
                        width: scrollX.interpolate({
                          inputRange,
                          outputRange: widthRange,
                          extrapolate: "clamp",
                        }),
                        opacity: scrollX.interpolate({
                          inputRange,
                          outputRange: opacityRange,
                          extrapolate: "clamp",
                        }),
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <View style={[styles.actions, { paddingTop: actionsGap }]}>
            <AuthButton
              label="Sign Up"
              variant="outline"
              style={{ height: buttonHeight }}
              labelStyle={styles.actionLabel}
              onPress={async () => {
                await supabase.auth.signOut();
                router.push("/(auth)/signup");
              }}
            />
            <AuthButton
              label="Log In"
              variant="primary"
              style={{ height: buttonHeight }}
              labelStyle={styles.actionLabel}
              onPress={async () => {
                await supabase.auth.signOut();
                router.push("/(auth)/login");
              }}
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
    flex: 1,
  },

  brandTitle: {
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 33,
    letterSpacing: -0.2,
    textAlign: "center",
    marginTop: -2,
    marginBottom: 8,
  },

  heroBox: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  heroImage: {
    width: "82%",
    height: "82%",
  },

  infoSection: {
    justifyContent: "flex-start",
  },

  slideTrack: {
    alignItems: "flex-start",
  },

  slide: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 2,
  },

  heading: {
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 22,
    letterSpacing: -0.6,
    textAlign: "center",
    marginBottom: 10,
  },

  copy: {
    fontFamily: T.font.family,
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: "center",
    paddingHorizontal: 6,
  },

  pager: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  dot: {
    height: 8,
    borderRadius: 999,
  },

  actions: {
    gap: 10,
    marginTop: "auto",
  },

  actionLabel: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
