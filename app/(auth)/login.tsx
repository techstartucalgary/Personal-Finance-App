import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";

const COLORS = {
  bg: "#FFFFFF",
  text: "#111111",
  subtext: "#7C808D",
  border: "#DDDDDD",
  primary: "#013f33ff",
  inputCursor: "#013f33ff",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleLogin() {
    console.log("Email:", email);
    console.log("Password:", password);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.select({ ios: "padding", android: "height" })}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <Text style={styles.title}>Login</Text>

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
          onPress={handleLogin}
          style={[styles.primaryBtn, { backgroundColor: COLORS.primary }]}
        >
          <Text style={styles.primaryBtnText}>Login</Text>
        </Pressable>

        {/* Link to signup */}
        <View style={styles.linkRow}>
          <Text style={[styles.linkPrompt, { color: COLORS.subtext }]}>
            Don’t have an account?{" "}
          </Text>
          <Link
            href="/(auth)/signup"
            style={[styles.link, { color: COLORS.primary }]}
          >
            Sign up
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
    marginTop: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },

  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  linkPrompt: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: "600" },
});
