import React, { useState } from "react";
import { StyleSheet, View, Text, TextInput, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function Login() {
  // state for inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // temporary button handler
  function handleLogin() {
    console.log("Email:", email);
    console.log("Password:", password);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      {/* Email Field */}
      <View style={styles.inputRow}>
        <Feather name="mail" size={20} color="#7C808D" style={styles.leftIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#7C808D"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Password Field */}
      <View style={styles.inputRow}>
        <Feather name="lock" size={20} color="#7C808D" style={styles.leftIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#7C808D"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#7C808D" />
        </Pressable>
      </View>

      {/* Login Button */}
      <Pressable onPress={handleLogin} style={styles.loginButton}>
        <Text style={styles.loginText}>Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#ddd",
    marginBottom: 20,
    position: "relative",
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  eyeButton: {
    position: "absolute",
    right: 0,
    padding: 8,
  },
  loginButton: {
    backgroundColor: "#013f33ff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  loginText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
