import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, Text as PaperText, Portal } from "react-native-paper";

import { AuthButton } from "@/components/auth_buttons/auth-button";
import { InputField } from "@/components/auth_buttons/input-field";
import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";

const { height: VH } = Dimensions.get("window");
const TOP_SPACE = VH * 0.04;

export default function SignUp() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Notice");
  const [dialogMessage, setDialogMessage] = useState("");

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const handleSignUp = async () => {
    if (loading) return;

    if (password !== confirmPassword) {
      showDialog("Passwords don’t match", "Please re-enter your password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
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
    <View style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />

      {/* Header matches signup-social */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>

        <Text style={[styles.title, { color: C.text }]}>Sign up</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.main}>
        <View style={{ height: TOP_SPACE }} />

        <InputField
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <InputField
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          showPasswordToggle
          onTogglePassword={() => setShowPassword((v) => !v)}
        />

        <InputField
          label="Confirm password"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          showPasswordToggle
          onTogglePassword={() => setShowConfirm((v) => !v)}
        />

        <View style={{ height: 10 }} />

        <AuthButton
          label={loading ? "Creating..." : "Create account"}
          variant="primary"
          onPress={handleSignUp}
        />

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: "rgba(2,2,2,0.65)" }]}>
            Already have an account?{" "}
          </Text>
          <Link
            href="/(auth)/login"
            style={[styles.footerLink, { color: C.text }]}
          >
            Log in
          </Link>
        </View>
      </View>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
          <Dialog.Title>{dialogTitle}</Dialog.Title>
          <Dialog.Content>
            <PaperText>{dialogMessage}</PaperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const T = Tokens;

const styles = StyleSheet.create({
  screen: { flex: 1 },

  topBar: {
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: T.space.pageX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  title: {
    fontFamily: T.font.family,
    fontSize: 26,
    fontWeight: T.font.weightBold,
  },

  main: {
    flex: 1,
    paddingHorizontal: T.space.pageX,
  },

  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
  },

  footerText: { fontSize: 14, fontFamily: T.font.family },
  footerLink: { fontSize: 14, fontFamily: T.font.family, fontWeight: "700" },
});
