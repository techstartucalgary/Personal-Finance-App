import React, { useState } from "react";
import { StyleSheet, View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function SignUp() {
  // basic fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // future: AuthProvider & ProviderUserID will be handled automatically
  // CreatedAt can be added by the backend later

  function handleSignUp() {
    console.log("User data:");
    console.log({
      firstName,
      lastName,
      email,
      password, // later -> hash before sending to backend
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Create Account</Text>

      {/* FIRST NAME */}
      <View style={styles.inputRow}>
        <Feather name="user" size={20} color="#7C808D" style={styles.leftIcon} />
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#7C808D"
          value={firstName}
          onChangeText={setFirstName}
        />
      </View>

      {/* LAST NAME */}
      <View style={styles.inputRow}>
        <Feather name="user" size={20} color="#7C808D" style={styles.leftIcon} />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#7C808D"
          value={lastName}
          onChangeText={setLastName}
        />
      </View>

      {/* EMAIL */}
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

      {/* PASSWORD */}
      <View style={styles.inputRow}>
        <Feather name="lock" size={20} color="#7C808D" style={styles.leftIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#7C808D"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#7C808D" />
        </Pressable>
      </View>

      {/* SIGN-UP BUTTON */}
      <Pressable onPress={handleSignUp} style={styles.signUpButton}>
        <Text style={styles.signUpText}>Sign Up</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "white",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "left",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#ddd",
    marginBottom: 20,
    position: "relative",
  },
  leftIcon: { marginRight: 10 },
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
  signUpButton: {
    backgroundColor: "#013f33ff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  signUpText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
