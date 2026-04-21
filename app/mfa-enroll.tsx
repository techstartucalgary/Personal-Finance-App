import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { supabase } from "@/utils/supabase";

type EnrollStep = "qr" | "verify";

export default function MFAEnrollScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ui = useThemeUI();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Enrollment state
  const [step, setStep] = useState<EnrollStep>("qr");
  const [factorId, setFactorId] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [secret, setSecret] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(true);
  const [enrollError, setEnrollError] = useState("");

  // Verify state
  const [code, setCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const codeInputRef = useRef<TextInput>(null);

  // Clean up orphaned unverified factors before enrolling
  const cleanupUnverifiedFactors = useCallback(async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (!factors?.all) return;
    for (const f of factors.all) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        console.log("[MFA] Cleaning up unverified factor:", f.id);
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
  }, []);

  const handleClose = useCallback(() => {
    router.dismiss();
  }, [router]);

  // Start enrollment on mount
  useEffect(() => {
    let cancelled = false;

    const startEnrollment = async (retryCount = 0): Promise<void> => {
      setEnrollLoading(true);
      setEnrollError("");

      // Always attempt cleanup first
      try {
        await cleanupUnverifiedFactors();
      } catch (e) {
        console.warn("[MFA] Factor cleanup error (continuing):", e);
      }

      if (cancelled) return;

      const friendlyName = `totp-${Date.now()}`;
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName,
        issuer: "Sterling Money",
      });

      if (cancelled) return;

      if (error) {
        // If the error is "already exists" and we haven't retried yet,
        // force-cleanup and try one more time
        if (error.message.includes("already exists") && retryCount < 1) {
          console.log("[MFA] Factor conflict — retrying after cleanup...");
          try {
            await cleanupUnverifiedFactors();
          } catch { }
          return startEnrollment(retryCount + 1);
        }

        setEnrollError(error.message);
        setEnrollLoading(false);
        return;
      }

      setFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrollLoading(false);
    };

    startEnrollment();

    return () => {
      cancelled = true;
    };
  }, [cleanupUnverifiedFactors]);

  // Handle verify
  const handleVerify = useCallback(async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setVerifyError("Please enter a 6-digit code.");
      return;
    }

    Keyboard.dismiss();
    setVerifyError("");
    setVerifyLoading(true);

    try {
      // Step 1: Create challenge
      const challengeResult = await supabase.auth.mfa.challenge({ factorId });
      if (challengeResult.error) {
        setVerifyError(challengeResult.error.message);
        return;
      }

      const challengeId = challengeResult.data.id;

      // Step 2: Verify code
      const verifyResult = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: trimmed,
      });

      if (verifyResult.error) {
        setVerifyError(verifyResult.error.message);
        return;
      }

      // Success!
      Alert.alert(
        "Two-Factor Enabled",
        "Your account is now protected with two-factor authentication.",
        [{ text: "Done", onPress: handleClose }]
      );
    } catch (err: any) {
      setVerifyError(err?.message ?? "An unexpected error occurred.");
    } finally {
      setVerifyLoading(false);
    }
  }, [code, factorId, handleClose]);

  // Copy secret to clipboard
  const handleCopySecret = useCallback(async () => {
    try {
      await Share.share({ message: secret });
    } catch {
      // User cancelled share sheet — no-op
    }
  }, [secret]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Set Up Two-Factor Auth",
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: ui.surface }
              : undefined,
          headerTintColor: ui.text,
          headerTitleStyle: { color: ui.text },
          headerRight: () => null,
          headerLeft: () => (
            <Pressable
              onPress={handleClose}
              hitSlop={15}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.6 : 1,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <IconSymbol name="xmark" size={22} color={ui.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: Platform.OS === "ios" ? ui.surface : ui.bg }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Loading State ─── */}
        {enrollLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ui.accent} />
            <ThemedText style={[styles.loadingText, { color: ui.mutedText }]}>
              Setting up authenticator…
            </ThemedText>
          </View>
        )}

        {/* ─── Enroll Error ─── */}
        {enrollError ? (
          <View style={styles.centered}>
            <Feather name="alert-circle" size={48} color={ui.destructive} />
            <ThemedText
              style={[styles.errorHeading, { color: ui.destructive }]}
            >
              Setup Failed
            </ThemedText>
            <ThemedText
              style={[styles.errorBody, { color: ui.mutedText }]}
              selectable
            >
              {enrollError}
            </ThemedText>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.retryBtn,
                { borderColor: ui.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={{ color: ui.accent }}>Go Back</ThemedText>
            </Pressable>
          </View>
        ) : null}

        {/* ─── Step 1: QR Code ─── */}
        {!enrollLoading && !enrollError && step === "qr" && (
          <View style={styles.stepContainer}>
            {/* Instructions */}
            <View style={styles.instructionBlock}>
              <View
                style={[styles.stepBadge, { backgroundColor: ui.accentSoft }]}
              >
                <ThemedText
                  style={[styles.stepBadgeText, { color: ui.accent }]}
                >
                  Step 1 of 2
                </ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.stepTitle}>
                Scan QR Code
              </ThemedText>
              <ThemedText style={[styles.stepDesc, { color: ui.mutedText }]}>
                Open your authenticator app (Google Authenticator, Authy, or
                1Password) and scan the QR code below.
              </ThemedText>
            </View>

            {/* QR Code Card */}
            <View
              style={[
                styles.qrCard,
                { backgroundColor: "#FFFFFF", borderColor: ui.border },
              ]}
            >
              {qrSvg ? (() => {
                // Clean the SVG and ensure it has a proper viewBox
                let cleanSvg = qrSvg.replace(/^data:image\/svg\+xml;utf-8,/, "");

                // Extract existing viewBox, or derive from width/height
                const viewBoxMatch = cleanSvg.match(/viewBox="([^"]*)"/);
                const widthMatch = cleanSvg.match(/width="(\d+)"/);
                const heightMatch = cleanSvg.match(/height="(\d+)"/);
                const vb = viewBoxMatch?.[1]
                  ?? `0 0 ${widthMatch?.[1] ?? "256"} ${heightMatch?.[1] ?? "256"}`;

                // Strip all dimension attributes from the root <svg> tag
                cleanSvg = cleanSvg
                  .replace(/width="[^"]*"/, "")
                  .replace(/height="[^"]*"/, "");

                // Ensure viewBox is set
                if (!viewBoxMatch) {
                  cleanSvg = cleanSvg.replace(/<svg/, `<svg viewBox="${vb}"`);
                }

                return (
                  <View
                    style={{
                      width: 220,
                      height: 220,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                    }}
                  >
                    <SvgXml
                      xml={cleanSvg}
                      width={200}
                      height={200}
                    />
                  </View>
                );
              })() : null}
            </View>

            {/* Manual Secret */}
            <View style={styles.secretBlock}>
              <ThemedText
                style={[styles.secretLabel, { color: ui.mutedText }]}
              >
                Can't scan? Enter this key manually:
              </ThemedText>
              <Pressable
                onPress={handleCopySecret}
                style={({ pressed }) => [
                  styles.secretRow,
                  {
                    backgroundColor: ui.surface2,
                    borderColor: ui.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <ThemedText
                  style={[styles.secretText, { color: ui.text }]}
                  selectable
                  numberOfLines={1}
                >
                  {secret}
                </ThemedText>
                <Feather name="copy" size={18} color={ui.mutedText} />
              </Pressable>
            </View>

            {/* Continue Button */}
            <Pressable
              onPress={() => {
                setStep("verify");
                setTimeout(() => codeInputRef.current?.focus(), 300);
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: ui.accent },
                pressed && { opacity: 0.85 },
              ]}
            >
              <ThemedText
                style={[
                  styles.primaryBtnText,
                  {
                    color: ui.primaryText,
                  },
                ]}
              >
                I've Scanned the Code
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* ─── Step 2: Verify ─── */}
        {!enrollLoading && !enrollError && step === "verify" && (
          <View style={styles.stepContainer}>
            {/* Instructions */}
            <View style={styles.instructionBlock}>
              <View
                style={[styles.stepBadge, { backgroundColor: ui.accentSoft }]}
              >
                <ThemedText
                  style={[styles.stepBadgeText, { color: ui.accent }]}
                >
                  Step 2 of 2
                </ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.stepTitle}>
                Enter Verification Code
              </ThemedText>
              <ThemedText style={[styles.stepDesc, { color: ui.mutedText }]}>
                Enter the 6-digit code shown in your authenticator app to
                complete setup.
              </ThemedText>
            </View>

            {/* Code Input */}
            <View
              style={[
                styles.codeInputCard,
                { backgroundColor: ui.surface2, borderColor: ui.border },
              ]}
            >
              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={(text) => {
                  // Allow only digits, max 6
                  const digits = text.replace(/[^0-9]/g, "").slice(0, 6);
                  setCode(digits);
                  if (verifyError) setVerifyError("");
                }}
                placeholder="000000"
                placeholderTextColor={ui.mutedText}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                style={[
                  styles.codeInput,
                  {
                    color: ui.text,
                    fontVariant: ["tabular-nums"],
                  },
                ]}
              />
            </View>

            {/* Error */}
            {verifyError ? (
              <View style={styles.verifyErrorRow}>
                <Feather
                  name="alert-circle"
                  size={16}
                  color={ui.destructive}
                />
                <ThemedText
                  style={[styles.verifyErrorText, { color: ui.destructive }]}
                  selectable
                >
                  {verifyError}
                </ThemedText>
              </View>
            ) : null}

            {/* Verify Button */}
            <Pressable
              onPress={handleVerify}
              disabled={verifyLoading || code.trim().length !== 6}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: ui.accent },
                pressed && { opacity: 0.85 },
                (verifyLoading || code.trim().length !== 6) && {
                  opacity: 0.5,
                },
              ]}
            >
              {verifyLoading ? (
                <ActivityIndicator
                  size="small"
                  color={ui.primaryText}
                />
              ) : (
                <ThemedText
                  style={[
                    styles.primaryBtnText,
                    {
                      color: ui.primaryText,
                    },
                  ]}
                >
                  Verify & Enable
                </ThemedText>
              )}
            </Pressable>

            {/* Back to QR */}
            <Pressable
              onPress={() => setStep("qr")}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: ui.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={{ color: ui.text, fontWeight: "600" }}>
                Back to QR Code
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
  errorHeading: {
    fontSize: 20,
    fontWeight: "700",
  },
  errorBody: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepContainer: {
    gap: 24,
  },
  instructionBlock: {
    gap: 8,
  },
  stepBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  stepTitle: {
    fontWeight: "700",
    marginTop: 4,
  },
  stepDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  qrCard: {
    alignSelf: "center",
    padding: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  secretBlock: {
    gap: 8,
  },
  secretLabel: {
    fontSize: 14,
  },
  secretRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
    gap: 12,
  },
  secretText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1.5,
    flex: 1,
    fontVariant: ["tabular-nums"],
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  codeInputCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 12,
    paddingVertical: 8,
  },
  verifyErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  verifyErrorText: {
    fontSize: 14,
    flex: 1,
  },
});
