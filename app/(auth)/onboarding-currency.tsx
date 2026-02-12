import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from "react-native";

type CurrencyOption = { label: string; value: "CAD" | "USD" };

export default function Onboarding() {
  const options: CurrencyOption[] = useMemo(
    () => [
      { label: "CAD - Canadian Dollar", value: "CAD" },
      { label: "USD - US Dollar", value: "USD" },
    ],
    []
  );

  const [currency, setCurrency] = useState<CurrencyOption["value"]>("CAD");

  const selectedLabel =
    options.find((o) => o.value === currency)?.label ?? options[0].label;

  const onBack = () => {
    router.back();
  };

  const onConfirm = () => {
    // TODO later: persist currency (AsyncStorage / Supabase profile)
    router.push("/(auth)/onboarding-consent");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.shell}>
          {/* Progress label */}
          <Text style={styles.progressText}>Setting Up 1/5</Text>

          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Feather name="arrow-left" size={22} color="#111" />
            </Pressable>

            <Text style={styles.headerTitle}>Setting up</Text>

            {/* spacer for symmetry */}
            <View style={{ width: 34 }} />
          </View>

          <View style={styles.divider} />

          {/* Intro */}
          <Text style={styles.topBody}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
          </Text>

          {/* Placeholder circle */}
          <View style={styles.circleWrap}>
            <View style={styles.circle}>
              <View style={[styles.diag, styles.diagA]} />
              <View style={[styles.diag, styles.diagB]} />
            </View>
          </View>

          {/* Section */}
          <Text style={styles.sectionTitle}>Select base currency</Text>
          <Text style={styles.sectionBody}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
          </Text>

          {/* Select */}
          <View style={styles.selectWrap}>
            <View style={styles.selectInner}>
              {/* Visible selected label (THIS is what updates) */}
              <Text style={styles.selectLabel}>{selectedLabel}</Text>

              {/* Picker overlay */}
              <Picker
                selectedValue={currency}
                onValueChange={(v) => setCurrency(v as CurrencyOption["value"])}
                style={styles.picker}
                dropdownIconColor="#111"
                mode="dropdown"
              >
                {options.map((o) => (
                  <Picker.Item key={o.value} label={o.label} value={o.value} />
                ))}
              </Picker>

              {/* Chevron for iOS/Web aesthetic (Android shows its own in dropdown) */}
              <View style={styles.chevron}>
                <Feather name="chevron-down" size={18} color="#111" />
              </View>
            </View>
          </View>

          {/* Bottom button */}
          <View style={styles.bottom}>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <Text style={styles.ctaText}>CONFIRM</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F5F7" },

  screen: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },

  // responsive width constraint (doesn’t stretch on web/tablets)
  shell: {
    width: "100%",
    maxWidth: 420,
    flex: 1,
  },

  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2B2B2B",
    marginBottom: 10,
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
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  divider: {
    height: 2,
    backgroundColor: "#111",
    opacity: 0.25,
    marginBottom: 14,
  },

  topBody: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    color: "#111",
    opacity: 0.6,
    paddingHorizontal: 18,
    marginBottom: 18,
  },

  circleWrap: { alignItems: "center", marginBottom: 18 },

  circle: {
    width: 160,
    height: 160,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#111",
    opacity: 0.45,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginTop: 2,
  },

  sectionBody: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    color: "#111",
    opacity: 0.6,
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 22,
  },

  selectWrap: {
    borderWidth: 1.25,
    borderColor: "#B8B8B8",
    borderRadius: 8,
    backgroundColor: "#F6F6F6",
    overflow: "hidden",
  },

  selectInner: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
  },

  selectLabel: {
    fontSize: 12,
    color: "#111",
    opacity: 0.65,
    paddingRight: 28, // room for chevron
  },

  // Keep picker invisible but clickable; label above shows selection.
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
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    opacity: 0.9,
    pointerEvents: "none",
  },

  bottom: {
    marginTop: "auto",
    paddingTop: 18,
    paddingBottom: 10,
  },

  cta: {
    backgroundColor: "#111",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 12,
  },

  pressed: { opacity: 0.6 },
});
