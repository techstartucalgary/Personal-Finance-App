import { AuthButton } from "@/components/auth_buttons/auth-button";
import { Tokens, getColors } from "@/constants/authTokens";
import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type CurrencyOption = { label: string; value: "CAD" | "USD" };

export default function OnboardingCurrency() {
  const C = getColors("light");
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < 760;
  const horizontalPad = compact ? 20 : 26;
  const topPadding = (compact ? 0 : 4) + insets.top;
  const bottomPad = 0;
  const copyBottom = compact ? 16 : 20;
  const buttonTop = compact ? 16 : 20;

  const options: CurrencyOption[] = useMemo(
    () => [
      { label: "CAD - Canadian Dollar", value: "CAD" },
      { label: "USD - US Dollar", value: "USD" },
    ],
    []
  );

  const [currency, setCurrency] = useState<CurrencyOption["value"]>("CAD");
  const params = useLocalSearchParams<{ needsEmailConfirm?: string }>();

  const selectedLabel =
    options.find((o) => o.value === currency)?.label ?? options[0].label;

  const onBack = () => router.back();

  const onConfirm = () => {
    // TODO later: persist currency (AsyncStorage / Supabase profile)
    const needsEmailConfirm = params.needsEmailConfirm === "1" ? "1" : "0";
    router.push({
      pathname: "/(auth)/onboarding-consent",
      params: { needsEmailConfirm },
    });
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" backgroundColor={C.bg} />
      <View style={[styles.screen, { backgroundColor: C.bg }]}>
        <View
          style={[
            styles.container,
            {
              paddingTop: topPadding,
              paddingBottom: bottomPad,
              paddingHorizontal: horizontalPad,
            },
          ]}
        >
          <Text style={[styles.progressText, { color: C.text }]}>
            Setting Up 2/3
          </Text>

          <View style={styles.headerRow}>
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Feather name="arrow-left" size={22} color={C.text} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: C.text }]}>Setting up</Text>

            <View style={{ width: 34 }} />
          </View>

          <View style={[styles.divider, { backgroundColor: C.line }]} />

          <Text style={[styles.topBody, { color: C.muted }]}>
            Choose the currency you want Sterling to use for budgets, balances, and
            spending totals. You can change this later in settings.
          </Text>

          <View style={styles.circleWrap}>
            <View style={styles.circle}>
              <View style={[styles.diag, styles.diagA]} />
              <View style={[styles.diag, styles.diagB]} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: C.text }]}>
            Select your base currency
          </Text>
          <Text
            style={[
              styles.sectionBody,
              { color: C.muted, marginBottom: copyBottom },
            ]}
          >
            This helps format all of your numbers in the app.
          </Text>

          <View style={[styles.selectWrap, { borderColor: C.chipBorder }]}>
            <View style={styles.selectInner}>
              <Text style={[styles.selectLabel, { color: C.text }]}>
                {selectedLabel}
              </Text>

              <Picker
                selectedValue={currency}
                onValueChange={(v) => setCurrency(v as CurrencyOption["value"])}
                style={styles.picker}
                dropdownIconColor={C.text}
                mode="dropdown"
              >
                {options.map((o) => (
                  <Picker.Item key={o.value} label={o.label} value={o.value} />
                ))}
              </Picker>

              <View style={styles.chevron}>
                <Feather name="chevron-down" size={18} color={C.text} />
              </View>
            </View>
          </View>

          <View style={[styles.bottom, { paddingTop: buttonTop }]}>
            <AuthButton
              label="Confirm"
              variant="primary"
              onPress={onConfirm}
              style={styles.cta}
              labelStyle={styles.ctaText}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const T = Tokens;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },

  progressText: {
    fontFamily: T.font.semiFamily ?? T.font.family,
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: 12,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 17,
    letterSpacing: -0.2,
  },

  divider: {
    height: 2,
    opacity: 0.2,
    marginBottom: 16,
  },

  topBody: {
    fontFamily: T.font.family,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 18,
    marginBottom: 20,
  },

  circleWrap: { alignItems: "center", marginBottom: 18 },

  circle: {
    width: 170,
    height: 170,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
    opacity: 0.35,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  diag: {
    position: "absolute",
    width: 220,
    height: 1.5,
    backgroundColor: "#111",
    opacity: 0.35,
  },
  diagA: { transform: [{ rotate: "45deg" }] },
  diagB: { transform: [{ rotate: "-45deg" }] },

  sectionTitle: {
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 16,
    letterSpacing: -0.2,
    textAlign: "center",
    marginTop: 2,
  },

  sectionBody: {
    fontFamily: T.font.family,
    fontSize: 14.5,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 22,
  },

  selectWrap: {
    borderWidth: 1.25,
    borderRadius: 10,
    backgroundColor: "#E1E1E1",
    overflow: "hidden",
  },

  selectInner: {
    minHeight: 52,
    paddingHorizontal: 14,
    justifyContent: "center",
  },

  selectLabel: {
    fontFamily: T.font.family,
    fontSize: 15,
    paddingRight: 28,
    opacity: 0.78,
  },

  picker: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: Platform.OS === "android" ? 0.02 : 0.01,
  },

  chevron: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    opacity: 0.9,
    pointerEvents: "none",
  },

  bottom: {
    marginTop: "auto",
    paddingBottom: 10,
  },

  cta: {
    height: 50,
  },
  ctaText: {
    fontSize: 18,
    letterSpacing: 0.6,
  },

  pressed: { opacity: 0.6 },
});
