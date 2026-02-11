import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Button, Dialog, Text as PaperText, Portal } from "react-native-paper";

const COLORS = {
  primary: "#013f33ff",
  inputCursor: "#013f33ff",
};

export default function Login() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const backgroundColor = theme.background;
  const textColor = theme.text;
  const subtextColor = theme.icon;
  const borderColor = theme.icon;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dialog state (replaces Alert)
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Notice");
  const [dialogMessage, setDialogMessage] = useState("");

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "801083441538-qdj0ai72fhs80t56379l3eo9tnlad2go.apps.googleusercontent.com",
      iosClientId:
        "801083441538-653cd41r45k21kd0u6cgrlf4d5km4uf8.apps.googleusercontent.com",
    });
  }, []);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log("Login error", error);
        showDialog("Login error", error.message);
        return;
      }

      router.replace("/(tabs)");
      console.log("Successfully logged in!");
    } finally {
      setLoading(false);
    }
  }

  // Social handlers
  async function handleGoogle() {
    if (Platform.OS === "web") {
      showDialog(
        "Error",
        "Google Sign-in is not supported on web in this version.",
      );
      return;
    }
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) return;

      const idToken = response.data.idToken;
      if (!idToken) {
        showDialog("Google Sign-In Error", "No ID token returned.");
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        showDialog("Google Sign-In Error", error.message);
        return;
      }

      router.replace("/(tabs)");
    } catch (error: any) {
      if (error?.code === statusCodes.IN_PROGRESS) return;

      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showDialog(
          "Google Sign-In Error",
          "Google Play Services is not available or is outdated.",
        );
        return;
      }

      console.log("Google Sign-In Error", error);
      showDialog("Google Sign-In Error", "Sign-in failed. Please try again.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor }}
        contentContainerStyle={[styles.container, { backgroundColor }]}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <Text style={[styles.title, { color: textColor }]}>Login</Text>

        {/* Email */}
        <View style={[styles.inputRow, { borderBottomColor: borderColor }]}>
          <Feather
            name="mail"
            size={20}
            color={subtextColor}
            style={styles.leftIcon}
          />
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Email"
            placeholderTextColor={subtextColor}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            selectionColor={COLORS.inputCursor}
            underlineColorAndroid="transparent"
          />
        </View>

        {/* Password */}
        <View style={[styles.inputRow, { borderBottomColor: borderColor }]}>
          <Feather
            name="lock"
            size={20}
            color={subtextColor}
            style={styles.leftIcon}
          />
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Password"
            placeholderTextColor={subtextColor}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            selectionColor={COLORS.inputCursor}
            underlineColorAndroid="transparent"
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            <Feather
              name={showPassword ? "eye" : "eye-off"}
              size={20}
              color={subtextColor}
            />
          </Pressable>
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleLogin}
          style={[styles.primaryBtn, { backgroundColor: COLORS.primary }]}
        >
          <Text style={styles.primaryBtnText}>Login</Text>
        </Pressable>

        {/* OR LINE */}
        <View style={styles.orContainer}>
          <View
            style={[styles.orLine, { backgroundColor: borderColor }]}
          ></View>
          <Text style={[styles.orText, { color: subtextColor }]}>OR</Text>
          <View
            style={[styles.orLine, { backgroundColor: borderColor }]}
          ></View>
        </View>

        {/* Social logins */}
        <View style={{ gap: 10, marginTop: 10 }}>
          {/* Google Login */}
          <Pressable
            onPress={handleGoogle}
            style={[
              styles.socialBtn,
              styles.shadow,
              { borderColor, backgroundColor },
            ]}
          >
            <Image
              source={require("../../assets/images/google.png")}
              style={styles.socialIcon}
              resizeMode="contain"
            />
            <Text style={[styles.socialText, { color: textColor }]}>
              Continue with Google
            </Text>
          </Pressable>

          {/* Apple Signup (needs a developer account) */}
          {/*
        <Pressable
            onPress={handleApple}
            style={[styles.socialBtn, styles.shadow]}
        >
            <Image
            source={require("../../assets/images/apple.png")}
            style={styles.socialIcon}
            resizeMode="contain"
            />
            <Text style={styles.socialText}>Signup with Apple</Text>
        </Pressable>
        */}
        </View>

        {/* Link to signup */}
        <View style={styles.linkRow}>
          <Text style={[styles.linkPrompt, { color: subtextColor }]}>
            Don’t have an account?{" "}
          </Text>
          <Link
            href="/(auth)/signup-social"
            style={[styles.link, { color: COLORS.primary }]}
          >
            Sign up
          </Link>
        </View>
      </KeyboardAwareScrollView>

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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { marginLeft: 8, fontSize: 28, fontWeight: "bold" },

  title: { fontSize: 24, fontWeight: "600", marginBottom: 28, color: "#111" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#DDDDDD",
    marginBottom: 20,
    position: "relative",
  },
  leftIcon: { marginRight: 10 },

  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },

  eyeButton: { position: "absolute", right: 0, padding: 8 },

  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },

  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
    justifyContent: "center",
  },
  orLine: { height: 1, backgroundColor: "#eee", flex: 1 },
  orText: {
    color: "#7c808d",
    fontSize: 12,
    marginHorizontal: 10,
    textAlign: "center",
  },

  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  shadow: {
    backgroundColor: "#F8F8F8",
  },
  socialIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
  },
  socialText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  linkPrompt: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: "600" },
});
