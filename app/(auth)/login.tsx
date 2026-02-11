import { AuthButton } from "@/components/auth_buttons/auth-button";
import { InputField } from "@/components/auth_buttons/input-field";
import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";
import { Feather, Ionicons } from "@expo/vector-icons";
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
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

export default function Login() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);
  const { height } = useWindowDimensions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "801083441538-qdj0ai72fhs80t56379l3eo9tnlad2go.apps.googleusercontent.com",
      iosClientId:
        "801083441538-653cd41r45k21kd0u6cgrlf4d5km4uf8.apps.googleusercontent.com",
    });
  }, []);

  const S = useMemo(() => {
    const compact = height < 760;
    return {
      topGap: compact ? 8 : 16,
      titleSize: compact ? 32 : 36,
      titleBottom: compact ? 12 : 16,
      formGap: compact ? 12 : 14,
      metaBottom: compact ? 18 : 24,
      actionTop: compact ? 16 : 20,
      socialTop: compact ? 12 : 16,
      footerMin: compact ? 30 : 60,
    };
  }, [height]);

  async function handleLogin() {
    if (loading) return;
    setAuthError("");

    if (!email.trim() || !password.trim()) {
      setAuthError("We do not recognize the email or password");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError("We do not recognize the email or password");
        return;
      }

      router.replace("/(tabs)/accounts");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (Platform.OS === "web") {
      setAuthError("Google sign-in is not supported on web");
      return;
    }

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;

      const idToken = response.data.idToken;
      if (!idToken) {
        setAuthError("Google sign-in failed");
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        setAuthError("Google sign-in failed");
        return;
      }

      router.replace("/(tabs)/accounts");
    } catch (error: any) {
      if (error?.code === statusCodes.IN_PROGRESS) return;
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setAuthError("Google Play Services is not available");
        return;
      }
      setAuthError("Google sign-in failed");
    }
  }

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
              <Feather name="arrow-left" size={24} color={C.text} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: C.text, fontSize: S.titleSize, marginBottom: S.titleBottom }]}>
            Glad to see you again!
          </Text>
          {!!authError ? <Text style={[styles.errorText, { color: C.danger }]}>We do not recognize the email or password</Text> : null}

          <View style={[styles.form, { gap: S.formGap }]}>
            <InputField
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (authError) setAuthError("");
              }}
              placeholder="Email"
              hasError={!!authError}
              inputProps={{ keyboardType: "email-address", autoCapitalize: "none" }}
            />

            <InputField
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (authError) setAuthError("");
              }}
              placeholder="Password"
              secureTextEntry={!showPassword}
              showPasswordToggle
              onTogglePassword={() => setShowPassword((v) => !v)}
              hasError={!!authError}
            />
          </View>

          <View style={[styles.metaRow, { marginBottom: S.metaBottom }]}>
            <Pressable style={styles.rememberWrap} onPress={() => setRememberMe((v) => !v)}>
              <Feather
                name={rememberMe ? "check-square" : "square"}
                size={20}
                color={C.text}
              />
              <Text style={[styles.helperText, { color: C.text }]}>Remember Me</Text>
            </Pressable>
            <Pressable>
              <Text style={[styles.helperText, { color: C.text }]}>Forgot Password?</Text>
            </Pressable>
          </View>

          <AuthButton
            label={loading ? "Logging In..." : "Log In"}
            variant="primary"
            onPress={handleLogin}
            disabled={loading}
          />

          <View style={[styles.socialBlock, { marginTop: S.actionTop }]}>
            <View style={styles.dividerRow}>
              <View style={[styles.line, { backgroundColor: C.line }]} />
              <Text style={[styles.orText, { color: C.text }]}>Or Continue With</Text>
              <View style={[styles.line, { backgroundColor: C.line }]} />
            </View>

            <View style={[styles.socialRow, { marginTop: S.socialTop }]}>
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

          <View style={[styles.footerSpacer, { minHeight: S.footerMin }]} />
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: C.text }]}>Do not have an account? </Text>
            <Link href="/(auth)/signup" style={[styles.footerLink, { color: C.text }]}>
              Sign Up Here
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  title: {
    fontFamily: T.font.headingFamily,
    lineHeight: 42,
  },
  errorText: {
    fontFamily: T.font.obliqueFamily ?? T.font.inputFamily,
    fontSize: T.font.bodySize - 1,
    marginBottom: 10,
  },
  form: {
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  rememberWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  helperText: {
    fontFamily: T.font.obliqueFamily ?? T.font.inputFamily,
    fontSize: T.font.helperSize,
    letterSpacing: 0.7,
  },
  socialBlock: {},
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
    fontFamily: T.font.semiFamily ?? T.font.inputFamily,
    fontSize: T.font.bodySize,
  },
});
