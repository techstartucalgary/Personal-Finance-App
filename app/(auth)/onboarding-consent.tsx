import { AuthButton } from "@/components/auth_buttons/auth-button";
import { Tokens, getColors } from "@/constants/authTokens";
import { Feather } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function OnboardingConsent() {
  const C = getColors("light");
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < 760;
  const horizontalPad = compact ? 20 : 26;
  const topPadding = (compact ? 0 : 4) + insets.top;
  const bottomPad = 0;
  const consentTop = compact ? 12 : 16;
  const buttonTop = compact ? 12 : 16;
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const params = useLocalSearchParams<{ needsEmailConfirm?: string }>();

  const policyText = useMemo(
    () => ({
      title: "Privacy Policy and Terms of Service",
      paragraphs: [
        "By using this app, you agree that we may collect and store the information needed to create your account and provide budgeting features. This may include your name, email, app settings (such as currency), and the financial entries you add (transactions, categories, and budgets).",
        "We use this data to sign you in, sync your information across devices, and improve reliability. We do not sell your personal information.",
        "Your data is stored securely with our service providers (for example, Supabase for authentication and database). We only share data when required to operate the app, comply with law, or protect users and the service.",
        "You can request access, correction, or deletion of your account data at any time. If you delete your account, we will remove or anonymize your data unless we are required to keep it for legal or security reasons.",
        "Full terms and privacy details are available in the complete policy documents.",
      ],
    }),
    []
  );

  const onBack = () => router.back();

  const onContinue = async () => {
    if (!agreed || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_complete: true },
      });
      if (error) {
        console.log("Failed to update onboarding flag:", error.message);
      }
    } finally {
      setSaving(false);
    }

    if (params.needsEmailConfirm === "1") {
      router.replace("/(auth)/login");
      return;
    }
    router.replace("/(tabs)");
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
          <Text style={[styles.progressText, { color: C.text }]}>Setting Up 3/3</Text>

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

          {/* Scrollable policy area */}
          <View style={[styles.policyCard, { backgroundColor: C.inputBg }]}>
            <ScrollView
              showsVerticalScrollIndicator
              contentContainerStyle={styles.policyContent}
            >
              <Text style={[styles.policyTitle, { color: C.text }]}>
                {policyText.title}
              </Text>

              {policyText.paragraphs.map((p, i) => (
                <Text
                  key={i}
                  style={[styles.policyBody, { color: C.text }, i > 0 && styles.policySpacing]}
                >
                  {p}
                </Text>
              ))}
            </ScrollView>
          </View>

          {/* Consent row */}
          <View style={[styles.consentRow, { marginTop: consentTop }]}>
            <Checkbox
              value={agreed}
              onValueChange={setAgreed}
              color={agreed ? C.text : undefined}
              style={styles.checkbox}
            />
            <Text style={[styles.consentText, { color: C.text }]}>
              I agree to the Privacy Policy and Terms of Service
            </Text>
          </View>

          {/* Bottom button */}
          <View style={[styles.bottom, { paddingTop: buttonTop }]}>
            <AuthButton
              label="Continue"
              variant="primary"
              onPress={onContinue}
              disabled={!agreed || saving}
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
    marginBottom: 14,
  },

  policyCard: {
    borderRadius: 12,
    borderWidth: 1.25,
    borderColor: "rgba(2,2,2,0.18)",
    flex: 1,
    overflow: "hidden",
  },

  policyContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  policyTitle: {
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 10,
  },

  policyBody: {
    fontFamily: T.font.family,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.72,
  },
  policySpacing: {
    marginTop: 10,
  },

  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginTop: 2,
  },

  consentText: {
    fontFamily: T.font.semiFamily ?? T.font.family,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.78,
    flex: 1,
  },

  bottom: {
    paddingBottom: 6,
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
