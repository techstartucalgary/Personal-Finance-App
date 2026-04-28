import { AuthButton } from "@/components/auth_buttons/auth-button";
import { InputField } from "@/components/auth_buttons/input-field";
import { getColors, Tokens } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function VerifyEmail() {
  const scheme = useColorScheme();
  const C = getColors(scheme);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const compact = height < 760;
  const horizontalPad = compact ? 20 : 26;
  const topPadding = (compact ? 0 : 4) + insets.top;

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setTimeout(
      () => setResendCooldown((c) => c - 1),
      1000
    );
    return () => clearTimeout(cooldownRef.current!);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (loading) return;

    const trimmed = code.trim();
    if (trimmed.length < 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: trimmed,
        type: "signup",
      });

      if (verifyError) {
        setError(
          verifyError.message.toLowerCase().includes("expired")
            ? "This code has expired. Please request a new one."
            : verifyError.message.toLowerCase().includes("invalid")
              ? "Invalid verification code. Please try again."
              : verifyError.message
        );
        return;
      }

      if (data.session) {
        // Successfully verified — the auth context will pick up the session
        // and redirect based on onboarding status
        router.replace("/(auth)/onboarding-profile");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendLoading || resendCooldown > 0) return;

    setResendLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        Alert.alert("Could not resend code", resendError.message);
        return;
      }

      setResendCooldown(60);
      Alert.alert(
        "Code sent",
        "A new verification code has been sent to your email."
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} backgroundColor={C.bg} />
      <View style={[styles.screen, { backgroundColor: C.bg }]}>
        <View
          style={[
            styles.container,
            {
              paddingTop: topPadding,
              paddingHorizontal: horizontalPad,
            },
          ]}
        >
          <View
            style={[
              styles.backBtnWrap,
              { top: topPadding - 4, left: horizontalPad - 2 },
            ]}
          >
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={24} color={C.text} />
            </Pressable>
          </View>

          <Text style={[styles.brandTitle, { color: "#000000" }]}>
            Sterling
          </Text>

          <KeyboardAvoidingView
            style={styles.formSection}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={topPadding + 12}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formScroll}
            >
              {/* Mail Icon */}
              <View style={styles.iconRow}>
                <View style={[styles.iconCircle, { backgroundColor: "#E8F5F1" }]}>
                  <Ionicons name="mail-outline" size={32} color="#1F6F5B" />
                </View>
              </View>

              <Text style={[styles.title, { color: "#000000" }]}>
                Verify your email
              </Text>

              <Text style={[styles.subtitle, { color: C.muted }]}>
                We sent a 6-digit verification code to{" "}
                <Text style={{ fontWeight: "600", color: "#000000" }}>
                  {email}
                </Text>
                . Enter it below to activate your account.
              </Text>

              <View style={styles.form}>
                <View style={styles.fieldBlock}>
                  <InputField
                    value={code}
                    onChangeText={(text) => {
                      const digits = text.replace(/\D/g, "").slice(0, 6);
                      setCode(digits);
                      if (error) setError("");
                    }}
                    placeholder="000000"
                    hasError={!!error}
                    forceScheme="light"
                    inputProps={{
                      keyboardType: "number-pad",
                      maxLength: 6,
                      autoFocus: true,
                      textContentType: "oneTimeCode",
                    }}
                    inputStyle={styles.codeInput}
                    containerStyle={styles.codeBox}
                  />
                  {error ? (
                    <Text style={[styles.fieldError, { color: C.danger }]}>
                      {error}
                    </Text>
                  ) : null}
                </View>

                <AuthButton
                  label={loading ? "Verifying..." : "Verify Email"}
                  variant="primary"
                  onPress={handleVerify}
                  disabled={loading || code.trim().length < 6}
                  style={styles.verifyBtn}
                  labelStyle={styles.actionLabel}
                />

                <View style={styles.resendRow}>
                  <Text style={[styles.resendText, { color: C.muted }]}>
                    Didn't receive a code?{" "}
                  </Text>
                  <Pressable
                    onPress={handleResend}
                    disabled={resendLoading || resendCooldown > 0}
                  >
                    <Text
                      style={[
                        styles.resendLink,
                        {
                          color:
                            resendCooldown > 0
                              ? C.muted
                              : "#1F6F5B",
                        },
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : resendLoading
                          ? "Sending..."
                          : "Resend"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
  },
  backBtnWrap: {
    position: "absolute",
    zIndex: 1,
  },
  backBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
  },
  brandTitle: {
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 33,
    letterSpacing: -0.2,
    textAlign: "center",
    marginTop: -2,
    marginBottom: 8,
  },
  title: {
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    fontSize: 24,
    letterSpacing: -0.6,
    textAlign: "center",
    lineHeight: 30,
    marginTop: 16,
  },
  subtitle: {
    fontFamily: T.font.family,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  iconRow: {
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    gap: 16,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldError: {
    fontFamily: T.font.family,
    fontSize: 13,
    textAlign: "center",
  },
  codeInput: {
    fontSize: 28,
    letterSpacing: 10,
    textAlign: "center",
    fontWeight: "600",
    fontFamily: T.font.boldFamily ?? T.font.headingFamily,
    paddingVertical: 12,
  },
  codeBox: {
    backgroundColor: "#E1E1E1",
    minHeight: 64,
  },
  verifyBtn: {
    height: 50,
  },
  actionLabel: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  formSection: {
    flex: 1,
  },
  formScroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  resendText: {
    fontFamily: T.font.family,
    fontSize: 14,
  },
  resendLink: {
    fontFamily: T.font.semiFamily ?? T.font.family,
    fontSize: 14,
    fontWeight: "600",
  },
});
