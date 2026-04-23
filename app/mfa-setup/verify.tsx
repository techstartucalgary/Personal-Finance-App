import Feather from "@expo/vector-icons/Feather";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { supabase } from "@/utils/supabase";
import { useMFAEnroll } from "./_layout";

export default function MFAVerifyStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const ui = useThemeUI();
  const { factorId } = useMFAEnroll();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const codeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Small delay to ensure navigation animation finishes
    const timer = setTimeout(() => codeInputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    router.dismiss();
  }, [router]);

  const handleVerify = useCallback(async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    Keyboard.dismiss();
    setError("");
    setLoading(true);

    try {
      const challengeResult = await supabase.auth.mfa.challenge({ factorId });
      if (challengeResult.error) {
        setError(challengeResult.error.message);
        return;
      }

      const verifyResult = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeResult.data.id,
        code: trimmed,
      });

      if (verifyResult.error) {
        setError(verifyResult.error.message);
        return;
      }

      Alert.alert(
        "Two-Factor Enabled",
        "Your account is now protected with two-factor authentication.",
        [{ text: "Done", onPress: handleClose }]
      );
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [code, factorId, handleClose]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Platform.OS === "ios" ? ui.surface2 : ui.bg }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Platform.OS === "ios" ? headerHeight + 8 : 24,
          paddingBottom: insets.bottom + 40,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepContainer}>
        <View style={styles.instructionBlock}>
          <View style={[styles.stepBadge, { backgroundColor: ui.accentSoft }]}>
            <ThemedText style={[styles.stepBadgeText, { color: ui.accent }]}>
              Step 2 of 2
            </ThemedText>
          </View>
          <ThemedText type="subtitle" style={styles.stepTitle}>
            Enter Verification Code
          </ThemedText>
          <ThemedText style={[styles.stepDesc, { color: ui.mutedText }]}>
            Enter the 6-digit code shown in your authenticator app to complete setup.
          </ThemedText>
        </View>

        <View style={[styles.codeInputCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
          <TextInput
            ref={codeInputRef}
            value={code}
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9]/g, "").slice(0, 6);
              setCode(digits);
              if (error) setError("");
            }}
            placeholder="000000"
            placeholderTextColor={ui.mutedText}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            style={[styles.codeInput, { color: ui.text, fontVariant: ["tabular-nums"] }]}
          />
        </View>

        {error ? (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={16} color={ui.destructive} />
            <ThemedText style={[styles.errorText, { color: ui.destructive }]} selectable>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          onPress={handleVerify}
          disabled={loading || code.trim().length !== 6}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: ui.accent },
            pressed && { opacity: 0.85 },
            (loading || code.trim().length !== 6) && { opacity: 0.5 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={ui.primaryText} />
          ) : (
            <ThemedText style={[styles.primaryBtnText, { color: ui.primaryText }]}>
              Verify & Enable
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingHorizontal: 20 },
  stepContainer: { gap: 24 },
  instructionBlock: { gap: 8 },
  stepBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  stepBadgeText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  stepTitle: { fontWeight: "700", marginTop: 4 },
  stepDesc: { fontSize: 15, lineHeight: 22 },
  codeInputCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderCurve: "continuous", paddingHorizontal: 20, paddingVertical: 16 },
  codeInput: { fontSize: 32, fontWeight: "700", textAlign: "center", letterSpacing: 12, paddingVertical: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  errorText: { fontSize: 14, flex: 1 },
  primaryBtn: { height: 52, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 17, fontWeight: "700" },
});
