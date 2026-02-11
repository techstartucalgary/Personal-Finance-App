import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

export function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  showPasswordToggle,
  onTogglePassword,
  keyboardType = "default",
  autoCapitalize = "none",
}: Props) {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.box,
          { backgroundColor: "#EDEDED", borderColor: "rgba(2,2,2,0.25)" },
        ]}
      >
        <Text style={[styles.label, { color: "rgba(2,2,2,0.70)" }]}>
          {label}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={"rgba(2,2,2,0.35)"}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, { color: C.text }]}
        />

        {showPasswordToggle && (
          <Pressable
            onPress={onTogglePassword}
            style={styles.eyeBtn}
            hitSlop={10}
          >
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.eye}
              resizeMode="contain"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const T = Tokens;

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },

  box: {
    borderWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    position: "relative",
  },

  label: {
    fontFamily: T.font.family,
    fontSize: 12,
    marginBottom: 6,
  },

  input: {
    fontFamily: T.font.family,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 18,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  eye: { width: 20, height: 20 },
});
