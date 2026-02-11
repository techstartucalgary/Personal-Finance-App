import { AuthButton } from "@/components/auth_buttons/auth-button";
import { InputField } from "@/components/auth_buttons/input-field";
import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, Dialog, Text as PaperText, Portal } from "react-native-paper";

export default function SignUp() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);
  const { height } = useWindowDimensions();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Notice");
  const [dialogMessage, setDialogMessage] = useState("");

  const S = useMemo(() => {
    const compact = height < 760;
    return {
      topGap: compact ? 8 : 12,
      heroHeight: compact ? 132 : 176,
      titleTop: compact ? 12 : 20,
      titleBottom: compact ? 12 : 16,
      formGap: compact ? 10 : 14,
      signTop: compact ? 14 : 20,
      socialTop: compact ? 14 : 22,
      footerMin: compact ? 16 : 56,
    };
  }, [height]);

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const handleSignUp = async () => {
    if (loading) return;

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      showDialog("Missing fields", "Please complete all fields before continuing.");
      return;
    }

    if (password !== confirmPassword) {
      showDialog("Passwords don't match", "Please re-enter your password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        showDialog("Sign Up Failed", error.message);
        return;
      }

      if (data.session) {
        router.replace("/(tabs)");
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

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.container, { paddingTop: S.topGap }]}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
              <Ionicons name="arrow-back" size={24} color={C.text} />
            </Pressable>
          </View>

          <View style={[styles.hero, { height: S.heroHeight }]}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: C.text, marginTop: S.titleTop, marginBottom: S.titleBottom }]}>
            Create your account
          </Text>

          <View style={[styles.form, { gap: S.formGap }]}>
            <InputField value={name} onChangeText={setName} placeholder="Name" />
            <InputField
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              inputProps={{ keyboardType: "email-address", autoCapitalize: "none" }}
            />
            <InputField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              showPasswordToggle
              onTogglePassword={() => setShowPassword((v) => !v)}
            />
            <InputField
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              secureTextEntry={!showConfirm}
              showPasswordToggle
              onTogglePassword={() => setShowConfirm((v) => !v)}
            />
          </View>

          <AuthButton
            label={loading ? "Creating..." : "Sign Up"}
            variant="primary"
            onPress={handleSignUp}
            disabled={loading}
            style={[styles.signUpBtn, { marginTop: S.signTop }]}
          />

          <View style={[styles.socialBlock, { marginTop: S.socialTop }]}>
            <View style={styles.dividerRow}>
              <View style={[styles.line, { backgroundColor: C.line }]} />
              <Text style={[styles.orText, { color: C.text }]}>Or Continue With</Text>
              <View style={[styles.line, { backgroundColor: C.line }]} />
            </View>

            <View style={styles.socialRow}>
              <Pressable style={styles.socialIconBtn} hitSlop={8}>
                <Image
                  source={require("../../assets/images/google.png")}
                  style={styles.socialIconImage}
                  resizeMode="contain"
                />
              </Pressable>
              <Pressable style={styles.socialIconBtn} hitSlop={8}>
                <Ionicons name="infinite" size={40} color="#1D74E7" />
              </Pressable>
            </View>
          </View>

          <View style={[styles.footerSpacer, { minHeight: S.footerMin }]} />
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: C.text }]}>Already have an account? </Text>
            <Link href="/(auth)/login" style={[styles.footerLink, { color: C.text }]}>
              Log In Here
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>

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
    paddingHorizontal: T.space.pageX,
    paddingBottom: 20,
  },
  topBar: {
    paddingBottom: 8,
  },
  backBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
  },
  hero: {
    height: 176,
    borderColor: "rgba(2,2,2,0.65)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
    marginTop: 4,
  },
  heroImage: {
    width: "78%",
    height: "78%",
  },
  title: {
    marginTop: 20,
    marginBottom: 16,
    fontFamily: T.font.headingFamily,
    fontSize: T.font.titleSize - 2,
    fontWeight: T.font.weightBold,
  },
  form: {
    gap: 14,
  },
  signUpBtn: {
    marginTop: 20,
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
    fontFamily: T.font.inputFamily,
    fontSize: T.font.bodySize,
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
    flex: 1,
    minHeight: 56,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontFamily: T.font.inputFamily,
    fontSize: T.font.bodySize,
  },
  footerLink: {
    fontFamily: T.font.inputFamily,
    fontSize: T.font.bodySize,
    fontWeight: "600",
  },
});
