import { AuthButton } from "@/components/auth_buttons/auth-button";
import { InputField } from "@/components/auth_buttons/input-field";
import { Tokens, getColors } from "@/constants/authTokens";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { configureGoogleOnce, signInWithGoogle } from "@/utils/authGoogle";

export default function Login() {
  const C = getColors("light");
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    configureGoogleOnce();
  }, []);

  const compact = height < 760;
  const horizontalPad = compact ? 20 : 26;
  const topPadding = (compact ? 0 : 4) + insets.top;
  const bottomPad = 0;
  const titleBottom = compact ? 12 : 16;
  const formGap = compact ? 8 : 10;
  const metaBottom = compact ? 10 : 12;
  const signTop = compact ? 14 : 18;
  const socialTop = compact ? 18 : 22;
  const footerMin = compact ? 24 : 40;

  async function handleLogin() {
    if (loading) return;
    setFormError("");

    const nextErrors: typeof errors = {};
    const emailValue = email.trim();
    const passwordValue = password.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValue) {
      nextErrors.email = "Please enter your email.";
    } else if (!emailPattern.test(emailValue)) {
      nextErrors.email = "Please enter a valid email address.";
    }
    if (!passwordValue) nextErrors.password = "Please enter your password.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrors({
          email: "Email or password is incorrect.",
          password: "Email or password is incorrect.",
        });
        return;
      }

      router.replace("/(tabs)/accounts");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await signInWithGoogle();
    if (!result.ok) {
      setFormError(result.message ?? "Google sign-in failed");
      return;
    }

    router.replace("/(tabs)/accounts");
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
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
          <View
            style={[
              styles.backBtnWrap,
              { top: topPadding - 4, left: horizontalPad - 2 },
            ]}
          >
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
              <Ionicons name="arrow-back" size={24} color={C.text} />
            </Pressable>
          </View>

          <Text style={[styles.brandTitle, { color: "#000000" }]}>Sterling</Text>

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
            <Text style={[styles.title, { color: "#000000", marginBottom: titleBottom }]}>
              Glad to see you again!
            </Text>
            {formError ? (
              <Text style={[styles.errorText, { color: C.danger }]}>{formError}</Text>
            ) : null}

            <View style={[styles.form, { gap: formGap }]}>
              <View style={styles.fieldBlock}>
                <InputField
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="Email"
                  hasError={!!errors.email}
                  inputProps={{ keyboardType: "email-address", autoCapitalize: "none" }}
                  forceScheme="light"
                  inputStyle={styles.inputText}
                  containerStyle={styles.inputBox}
                />
                {errors.email ? (
                  <Text style={[styles.fieldError, { color: C.danger }]}>{errors.email}</Text>
                ) : null}
              </View>

              <View style={styles.fieldBlock}>
                <InputField
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  showPasswordToggle
                  onTogglePassword={() => setShowPassword((v) => !v)}
                  hasError={!!errors.password}
                  forceScheme="light"
                  inputStyle={styles.inputText}
                  containerStyle={styles.inputBox}
                />
                {errors.password ? (
                  <Text style={[styles.fieldError, { color: C.danger }]}>
                    {errors.password}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.metaRow, { marginBottom: metaBottom }]}>
              <View />
              <Pressable>
                <Text style={[styles.helperText, { color: C.text }]}>Forgot Password?</Text>
              </Pressable>
            </View>

            <AuthButton
              label={loading ? "Logging In..." : "Log In"}
              variant="primary"
              onPress={handleLogin}
              disabled={loading}
              style={[styles.actionBtn, { marginTop: signTop }]}
              labelStyle={styles.actionLabel}
            />

            <View style={[styles.socialBlock, { marginTop: socialTop }]}>
              <View style={styles.dividerRow}>
                <View style={[styles.line, { backgroundColor: C.line }]} />
                <Text style={[styles.orText, { color: C.text }]}>Or Continue With</Text>
                <View style={[styles.line, { backgroundColor: C.line }]} />
              </View>

              <View style={styles.socialRow}>
                <Pressable style={styles.socialIconBtn} onPress={handleGoogle} hitSlop={8}>
                  <Image
                    source={require("../../assets/images/google.png")}
                    style={styles.socialIconImage}
                    resizeMode="contain"
                  />
                </Pressable>
                <Pressable style={styles.socialIconBtn} hitSlop={8}>
                  <Image
                    source={require("../../assets/images/apple.png")}
                    style={styles.socialIconImage}
                    resizeMode="contain"
                  />
                </Pressable>
              </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={[styles.footerSpacer, { minHeight: footerMin }]} />
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: C.text }]}>Do not have an account? </Text>
            <Link href="/(auth)/signup" style={[styles.footerLink, { color: C.text }]}>
              Sign Up Here
            </Link>
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
    textAlign: "left",
    lineHeight: 30,
  },
  inputBox: {
    backgroundColor: "#E1E1E1",
    minHeight: 56,
  },
  inputText: {
    fontFamily: T.font.family,
    fontSize: 15.5,
    paddingVertical: 8,
  },
  fieldBlock: {
    gap: 4,
  },
  fieldError: {
    fontFamily: T.font.family,
    fontSize: 13,
  },
  errorText: {
    fontFamily: T.font.family,
    fontSize: 14.5,
    marginBottom: 10,
  },
  form: {},
  formSection: {
    flex: 1,
  },
  formScroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  helperText: {
    fontFamily: T.font.family,
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  actionBtn: {
    marginTop: 20,
    height: 50,
  },
  actionLabel: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  socialBlock: {
    marginTop: 22,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    height: 1.2,
    flex: 1,
    maxWidth: 116,
  },
  orText: {
    marginHorizontal: 12,
    fontFamily: T.font.family,
    fontSize: 15.5,
  },
  socialRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  socialIconBtn: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  socialIconImage: {
    width: 36,
    height: 36,
  },
  footerSpacer: {
    minHeight: 56,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontFamily: T.font.family,
    fontSize: 15.5,
  },
  footerLink: {
    fontFamily: T.font.semiFamily ?? T.font.family,
    fontSize: 15.5,
  },
});
