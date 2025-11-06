import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
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

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSignUp() {
    console.log("User data:", { firstName, lastName, email, password });
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

  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  linkPrompt: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: "600" },
});
