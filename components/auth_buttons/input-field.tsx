import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  ViewStyle,
  View,
} from "react-native";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  hasError?: boolean;
  inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "placeholder">;
  inputStyle?: TextStyle;
  containerStyle?: ViewStyle;
  forceScheme?: "light" | "dark";
};

export function InputField({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  showPasswordToggle = false,
  onTogglePassword,
  hasError = false,
  inputProps,
  inputStyle,
  containerStyle,
  forceScheme,
}: Props) {
  const scheme = (forceScheme ?? useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: C.inputBg },
        hasError ? styles.error : null,
        containerStyle,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          { color: C.text },
          showPasswordToggle ? styles.inputWithIcon : null,
          inputStyle,
        ]}
        selectionColor={C.primaryBtn}
        underlineColorAndroid="transparent"
        {...inputProps}
      />

      {showPasswordToggle ? (
        <Pressable onPress={onTogglePassword} style={styles.eyeButton} hitSlop={8}>
          <Ionicons name={secureTextEntry ? "eye" : "eye-off"} size={20} color="#707070" />
        </Pressable>
      ) : null}
    </View>
  );
}

const T = Tokens;

const styles = StyleSheet.create({
  box: {
    minHeight: T.size.inputH,
    borderRadius: T.radius.card,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
  },
  error: {
    borderColor: "#EF4444",
  },
  input: {
    fontFamily: T.font.inputFamily,
    fontSize: T.font.bodySize,
    paddingVertical: 10,
  },
  inputWithIcon: {
    paddingRight: 36,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
