import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Linking,
  Alert,
} from "react-native";

export default function OnboardingConsent() {
  const [agreed, setAgreed] = useState(false);

  const PRIVACY_POLICY_URL =
    "https://hollow-chocolate-f29.notion.site/Sterling-Privacy-Policy-32843f324ec080389953ee8002665c31";

  const openPrivacyPolicy = async () => {
    try {
      const supported = await Linking.canOpenURL(PRIVACY_POLICY_URL);

      if (!supported) {
        Alert.alert("Unable to open link", "Please try again later.");
        return;
      }

      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert("Unable to open link", "Please try again later.");
    }
  };

  const policyText = useMemo(
    () => ({
      title: "Privacy Policy and Terms of Service",
      paragraphs: [
        "By using this app, you agree that we may collect and store the information needed to create your account and provide budgeting features. This may include your name, email, app settings (such as currency), and the financial entries you add (transactions, categories, and budgets).",
        "We use this data to sign you in, sync your information across devices, and improve reliability. We do not sell your personal information.",
        "Your data is stored securely with our service providers (for example, Supabase for authentication and database). We only share data when required to operate the app, comply with law, or protect users and the service.",
        "You can request access, correction, or deletion of your account data at any time. If you delete your account, we will remove or anonymize your data unless we are required to keep it for legal or security reasons.",
      ],
    }),
    []
  );

  const onBack = () => {
    // TODO: hook into your onboarding nav
    console.log("back");
  };

  const onContinue = () => {
    if (!agreed) return;
    // TODO: persist consent + go to next step
    console.log("continue");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.shell}>
          <Text style={styles.progressText}>Setting Up (Consent Required)</Text>

          <View style={styles.headerRow}>
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Feather name="arrow-left" size={22} color="#111" />
            </Pressable>

            <Text style={styles.headerTitle}>Setting up</Text>
            <View style={{ width: 34 }} />
          </View>

          <View style={styles.divider} />

          <View style={styles.policyCard}>
            <ScrollView
              showsVerticalScrollIndicator
              contentContainerStyle={styles.policyContent}
            >
              <Text style={styles.policyTitle}>{policyText.title}</Text>

              {policyText.paragraphs.map((p, i) => (
                <Text key={i} style={styles.policyBody}>
                  {i === 0 ? p : `\n${i}. ${p}`}
                </Text>
              ))}

              <Text style={styles.policyBody}>
                {"\n"}5. Full terms and privacy details are available in the{" "}
                <Text
                  style={styles.linkText}
                  onPress={openPrivacyPolicy}
                  accessibilityRole="link"
                >
                  complete privacy policy
                </Text>
                .
              </Text>
            </ScrollView>
          </View>

          <View style={styles.consentRow}>
            <Checkbox
              value={agreed}
              onValueChange={setAgreed}
              color={agreed ? "#111" : undefined}
              style={styles.checkbox}
            />

            <Text style={styles.consentText}>
              I AGREE TO THE{" "}
              <Text
                style={styles.linkText}
                onPress={openPrivacyPolicy}
                accessibilityRole="link"
              >
                PRIVACY POLICY
              </Text>
              {"\n"}AND TERMS OF SERVICE
            </Text>
          </View>

          <View style={styles.bottom}>
            <Pressable
              onPress={onContinue}
              disabled={!agreed}
              style={({ pressed }) => [
                styles.cta,
                !agreed && styles.ctaDisabled,
                pressed && agreed && styles.ctaPressed,
              ]}
            >
              <Text style={styles.ctaText}>CONTINUE</Text>
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
    marginBottom: 12,
  },

  policyCard: {
    borderRadius: 12,
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#D4D4D4",
    flex: 1,
    overflow: "hidden",
  },

  policyContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  policyTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
    color: "#111",
  },

  policyBody: {
    fontSize: 12,
    lineHeight: 16,
    color: "#111",
    opacity: 0.7,
  },

  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },

  consentText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111",
    opacity: 0.75,
    lineHeight: 14,
    flex: 1,
  },

  linkText: {
    textDecorationLine: "underline",
    color: "#111",
  },

  bottom: {
    paddingTop: 14,
    paddingBottom: 10,
  },

  cta: {
    backgroundColor: "#111",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },

  ctaDisabled: {
    backgroundColor: "#111",
    opacity: 0.55,
  },

  ctaPressed: {
    opacity: 0.85,
  },

  ctaText: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 0.6,
    fontSize: 12,
  },

  pressed: {
    opacity: 0.6,
  },
});