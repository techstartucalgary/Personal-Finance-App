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
import { Button, Dialog, Text as PaperText, Portal } from "react-native-paper";
import { configureGoogleOnce, signInWithGoogle } from "@/utils/authGoogle";

export default function SignUp() {
  const C = getColors("light");
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Notice");
  const [dialogMessage, setDialogMessage] = useState("");

  const compact = height < 760;
  const horizontalPad = compact ? 20 : 26;
  const topPadding = (compact ? 0 : 4) + insets.top;
  const bottomPad = 0;
  const titleBottom = compact ? 12 : 16;
  const formGap = compact ? 8 : 10;
  const signTop = compact ? 14 : 18;
  const socialTop = compact ? 18 : 22;
  const footerMin = compact ? 24 : 40;

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  useEffect(() => {
    configureGoogleOnce();
  }, []);

  const handleSignUp = async () => {
    if (loading) return;

    const nextErrors: typeof errors = {};
    const emailValue = email.trim();
    const passwordValue = password.trim();
    const confirmValue = confirmPassword.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) nextErrors.name = "Please enter your name.";
    if (!emailValue) {
      nextErrors.email = "Please enter your email.";
    } else if (!emailPattern.test(emailValue)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!passwordValue) {
      nextErrors.password = "Please enter a password.";
    } else if (passwordValue.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmValue) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (confirmValue !== passwordValue) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            onboarding_complete: false,
          },
        },
      });

      if (error) {
        const message = error.message ?? "Sign up failed.";
        const lower = message.toLowerCase();
        const fieldErrors: typeof errors = {};
        if (lower.includes("email")) fieldErrors.email = "That email does not look right.";
        if (lower.includes("password"))
          fieldErrors.password = "That password does not meet the requirements.";
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          showDialog("Sign Up Failed", message);
        }
        return;
      }

      if (data.session) {
        router.replace("/(auth)/onboarding-profile");
        return;
      }

      showDialog(
        "Check your email",
        "A confirmation link has been sent to your email address.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const result = await signInWithGoogle();
    if (!result.ok) {
      showDialog("Google Sign-in Failed", result.message);
    }
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
                Let's get you set up
              </Text>
              <View style={[styles.form, { gap: formGap }]}>
                <View style={styles.fieldBlock}>
                  <InputField
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Name"
                    forceScheme="light"
                    inputStyle={styles.inputText}
                    containerStyle={styles.inputBox}
                    hasError={!!errors.name}
                  />
                  {errors.name ? (
                    <Text style={[styles.fieldError, { color: C.danger }]}>{errors.name}</Text>
                  ) : null}
                </View>
                <View style={styles.fieldBlock}>
                  <InputField
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="Email"
                    inputProps={{ keyboardType: "email-address", autoCapitalize: "none" }}
                    forceScheme="light"
                    inputStyle={styles.inputText}
                    containerStyle={styles.inputBox}
                    hasError={!!errors.email}
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
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    showPasswordToggle
                    onTogglePassword={() => setShowPassword((v) => !v)}
                    forceScheme="light"
                    inputStyle={styles.inputText}
                    containerStyle={styles.inputBox}
                    hasError={!!errors.password}
                  />
                  {errors.password ? (
                    <Text style={[styles.fieldError, { color: C.danger }]}>{errors.password}</Text>
                  ) : null}
                </View>
                <View style={styles.fieldBlock}>
                  <InputField
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) {
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Confirm Password"
                    secureTextEntry={!showConfirm}
                    showPasswordToggle
                    onTogglePassword={() => setShowConfirm((v) => !v)}
                    forceScheme="light"
                    inputStyle={styles.inputText}
                    containerStyle={styles.inputBox}
                    hasError={!!errors.confirmPassword}
                  />
                  {errors.confirmPassword ? (
                    <Text style={[styles.fieldError, { color: C.danger }]}>
                      {errors.confirmPassword}
                    </Text>
                  ) : null}
                </View>
              </View>

              <AuthButton
                label={loading ? "Creating..." : "Sign Up"}
                variant="primary"
                onPress={handleSignUp}
                disabled={loading}
                style={[styles.signUpBtn, { marginTop: signTop }]}
                labelStyle={styles.actionLabel}
              />

              <View style={[styles.socialBlock, { marginTop: socialTop }]}>
                <View style={styles.dividerRow}>
                  <View style={[styles.line, { backgroundColor: C.line }]} />
                  <Text style={[styles.orText, { color: C.text }]}>Or Continue With</Text>
                  <View style={[styles.line, { backgroundColor: C.line }]} />
                </View>

                <View style={styles.socialRow}>
                  <Pressable style={styles.socialIconBtn} hitSlop={8} onPress={handleGoogle}>
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
            <Text style={[styles.footerText, { color: C.text }]}>Already have an account? </Text>
            <Link href="/(auth)/login" style={[styles.footerLink, { color: C.text }]}>
              Log In Here
            </Link>
          </View>
        </View>
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{dialogTitle}</Dialog.Title>
          <Dialog.Content>
            <PaperText>{dialogMessage}</PaperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  form: {
    gap: 14,
  },
  formSection: {
    flex: 1,
  },
  formScroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
  signUpBtn: {
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
