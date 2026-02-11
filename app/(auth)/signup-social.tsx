import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Button, Dialog, Text as PaperText, Portal } from "react-native-paper";

import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { AuthButton } from "@/components/auth_buttons/auth-button";
import { OrDivider } from "@/components/auth_buttons/or-divider";
import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { configureGoogleOnce, signInWithGoogle } from "@/utils/authGoogle";

const { height: VH } = Dimensions.get("window");

const TOP_SPACE = VH * 0.06;
const LOGO_GAP = VH * 0.08;
const BOTTOM_SPACE = VH * 0.12;

export default function SignUpSocial() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);

  const [loading, setLoading] = useState(false);

  // Dialog
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Notice");
  const [dialogMessage, setDialogMessage] = useState("");

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  useEffect(() => {
    configureGoogleOnce();
  }, []);

  // ===== Smooth “story” transition =====
  const leaving = useSharedValue(0);

  const screenAnim = useAnimatedStyle(() => {
    const t = leaving.value;
    return {
      opacity: 1 - 0.18 * t,
      transform: [{ translateY: 10 * t }, { scale: 1 - 0.01 * t }],
    };
  });

  const goToEmailSignup = () => {
    leaving.value = withTiming(1, { duration: 220 }, () => {
      runOnJS(router.push)("/(auth)/signup");
    });
  };

  // ===== Buttons =====
  const onGooglePress = async () => {
    if (loading) return;
    setLoading(true);

    const res = await signInWithGoogle();
    setLoading(false);

    if (!res.ok) {
      showDialog("Google Sign-In Failed", res.message);
      return;
    }

    router.replace("/(tabs)");
  };

  const onApplePress = () => {
    // Keep as navigation for now (or wire later)
    goToEmailSignup();
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />

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

      <Animated.View style={[styles.main, screenAnim]}>
        <View style={{ height: TOP_SPACE }} />

        <View style={styles.logoWrap}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={{ height: LOGO_GAP }} />

        <View style={styles.actions}>
          <AuthButton
            label={loading ? "Signing in..." : "Continue with Google"}
            onPress={onGooglePress}
          />
          <AuthButton label="Continue with Apple" onPress={onApplePress} />

          <View style={styles.dividerWrap}>
            <OrDivider />
          </View>

          <AuthButton
            label="Create account"
            variant="primary"
            onPress={goToEmailSignup}
            style={styles.primarySpacing}
          />
        </View>

        <View style={{ height: BOTTOM_SPACE }} />
      </Animated.View>

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
    justifyContent: "flex-start",
  },

  logoWrap: {
    alignItems: "center",
    marginTop: 6,
  },
  logo: {
    width: T.size.logo,
    height: T.size.logo,
    borderRadius: T.size.logo / 2,
  },

  actions: {
    gap: 8,
  },

  dividerWrap: {
    marginTop: 2,
  },

  primarySpacing: {
    marginTop: 6,
  },
});
