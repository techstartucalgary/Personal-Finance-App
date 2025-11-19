import { supabase } from "@/utils/supabase";
import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const COLORS = {
  bg: "#FFFFFF",
  text: "#111111",
  subtext: "#7C808D",
  border: "#DDDDDD",
  primary: "#013f33ff",
  inputCursor: "#013f33ff",
};

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (loading) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      Alert.alert("SignUp Error", error.message);
      console.log("SignUp Error", error);
    } else if (data.session) {
      console.log("Success", "You have successfully signed up!");
      router.replace("/(tabs)");
    } else {
      Alert.alert(
        "Check your email",
        "A confirmation link has been sent to your email address."
      );
      console.log(
        "Check your email",
        "A confirmation link has been sent to your email address."
      );
    }
    setLoading(false);
  }

  // Social handlers (stub)
  function handleGoogle() {
    console.log("Login with Google pressed");
  }
  function handleApple() {
    console.log("Login with Apple pressed");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.select({ ios: "padding", android: "height" })}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <Text style={styles.title}>Create Your Account</Text>

        {/* First Name */}
        <View style={styles.inputRow}>
          <Feather
            name="user"
            size={20}
            color={COLORS.subtext}
            style={styles.leftIcon}
          />
          <TextInput
            style={[styles.input]}
            placeholder="First Name"
            placeholderTextColor={COLORS.subtext}
            value={firstName}
            onChangeText={setFirstName}
            selectionColor={COLORS.inputCursor}
            underlineColorAndroid="transparent"
          />
        </View>

        {/* Last Name */}
        <View style={styles.inputRow}>
          <Feather
            name="user"
            size={20}
            color={COLORS.subtext}
            style={styles.leftIcon}
          />
          <TextInput
            style={[styles.input]}
            placeholder="Last Name"
            placeholderTextColor={COLORS.subtext}
            value={lastName}
            onChangeText={setLastName}
            selectionColor={COLORS.inputCursor}
            underlineColorAndroid="transparent"
          />
        </View>

        {/* Email */}
        <View style={styles.inputRow}>
          <Feather
            name="mail"
            size={20}
            color={COLORS.subtext}
            style={styles.leftIcon}
          />
          <TextInput
            style={[styles.input]}
            placeholder="Email"
            placeholderTextColor={COLORS.subtext}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            selectionColor={COLORS.inputCursor}
            underlineColorAndroid="transparent"
          />
        </View>

        {/* Password */}
        <View style={styles.inputRow}>
          <Feather
            name="lock"
            size={20}
            color={COLORS.subtext}
            style={styles.leftIcon}
          />
          <TextInput
            style={[styles.input]}
            placeholder="Password"
            placeholderTextColor={COLORS.subtext}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
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
              color={COLORS.subtext}
            />
          </Pressable>
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleSignUp}
          style={[styles.primaryBtn, { backgroundColor: COLORS.primary }]}
        >
          <Text style={styles.primaryBtnText}>Sign Up</Text>
        </Pressable>

        {/* OR LINE */}
        <View style={styles.orContainer}>
          <View style={styles.orLine}></View>
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine}></View>
        </View>

        {/* Social Singup */}
        <View style={{ gap: 10, marginTop: 10 }}>
          {/* Google Singup */}
          <Pressable
            onPress={handleGoogle}
            style={[styles.socialBtn, styles.shadow]}
          >
            <Image
              source={require("../../assets/images/google.png")}
              style={styles.socialIcon}
              resizeMode="contain"
            />
            <Text style={styles.socialText}>Signup with Google</Text>
          </Pressable>

          {/* Apple Signup */}
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
        </View>

        {/* Link to login */}
        <View style={styles.linkRow}>
          <Text style={[styles.linkPrompt, { color: COLORS.subtext }]}>
            Already have an account?{" "}
          </Text>
          <Link
            href="/(auth)/login"
            style={[styles.link, { color: COLORS.primary }]}
          >
            Sign in instead
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
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
    marginTop: 10,
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
