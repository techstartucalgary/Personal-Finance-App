import { ThemedText } from "@/components/themed-text";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { supabase } from "@/utils/supabase";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MfaVerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ui = useThemeUI();
  const colorScheme = useColorScheme();

  // State
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

  // On mount, find the first verified TOTP factor
  useEffect(() => {
    (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError || !data) {
        setError("Could not load MFA factors.");
        setLoading(false);
        return;
      }

      const verifiedTotp = data.totp?.[0]; // first verified TOTP factor
      if (!verifiedTotp) {
        // No MFA factors — shouldn't be here, go to main app
        router.replace("/(tabs)/dashboard");
        return;
      }

      setFactorId(verifiedTotp.id);
      setLoading(false);

      // Auto-focus the input
      setTimeout(() => inputRef.current?.focus(), 300);
    })();
  }, []);

  const handleVerify = useCallback(async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    Keyboard.dismiss();
    setError("");
    setVerifyLoading(true);

    try {
      // Step 1: Create challenge
      const challengeResult = await supabase.auth.mfa.challenge({ factorId });
      if (challengeResult.error) {
        setError(challengeResult.error.message);
        return;
      }

      const challengeId = challengeResult.data.id;

      // Step 2: Verify the code
      const verifyResult = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: trimmed,
      });

      if (verifyResult.error) {
        setError(verifyResult.error.message);
        setCode("");
        return;
      }

      // Success — session is now AAL2, navigate to the main app
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Verification failed.");
    } finally {
      setVerifyLoading(false);
    }
  }, [code, factorId, router]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      "Sign Out",
      "Do you want to sign out and use a different account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/(auth)/onboarding-start");
          },
        },
      ]
    );
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Verify Identity",
          presentation: "card",
          headerTitleAlign: "center",
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: ui.surface }
              : undefined,
          headerTintColor: ui.text,
          headerTitleStyle: { color: ui.text },
          headerLeft: () => null,
          headerRight: () => null,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: Platform.OS === "ios" ? ui.surface : ui.bg }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ui.accent} />
            <ThemedText style={[styles.loadingText, { color: ui.mutedText }]}>
              Loading...
            </ThemedText>
          </View>
        ) : (
          <View style={styles.stepContainer}>
            {/* Icon */}
            <View style={styles.headerSection}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: ui.accentSoft },
                ]}
              >
                <Feather name="shield" size={32} color={ui.accent} />
              </View>
              <ThemedText
                type="title"
                style={[styles.heading, { color: ui.text }]}
              >
                Two-Factor{"\n"}Authentication
              </ThemedText>
              <ThemedText
                style={[styles.subtitle, { color: ui.mutedText }]}
              >
                Open your authenticator app and enter the 6-digit verification
                code to continue.
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
                ref={inputRef}
                style={[styles.codeInput, { color: ui.text }]}
                value={code}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
                  setCode(cleaned);
                  setError("");
                }}
                placeholder="000000"
                placeholderTextColor={ui.mutedText}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={false}
                onSubmitEditing={handleVerify}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={16} color={ui.destructive} />
                <ThemedText
                  style={[styles.errorText, { color: ui.destructive }]}
                >
                  {error}
                </ThemedText>
              </View>
            ) : null}

            {/* Verify Button */}
            <Pressable
              onPress={handleVerify}
              disabled={verifyLoading || code.trim().length !== 6}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor:
                    code.trim().length === 6 ? ui.accent : ui.accentSoft,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {verifyLoading ? (
                <ActivityIndicator size="small" color={ui.primaryText} />
              ) : (
                <ThemedText style={[styles.primaryBtnText, { color: ui.primaryText }]}>
                  Verify & Continue
                </ThemedText>
              )}
            </Pressable>

            {/* Sign Out Option */}
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: ui.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <ThemedText
                style={{ color: ui.mutedText, fontSize: 15, fontWeight: "600" }}
              >
                Use a Different Account
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
  stepContainer: {
    gap: 24,
    paddingTop: 20,
  },
  headerSection: {
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heading: {
    fontWeight: "700",
    fontSize: 26,
    textAlign: "center",
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 16,
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
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
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
});
