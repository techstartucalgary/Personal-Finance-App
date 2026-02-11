import { Tokens, getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from "react-native";

type Variant = "outline" | "primary";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  disabled?: boolean;
};

export function AuthButton({
  label,
  onPress,
  variant = "outline",
  style,
  labelStyle,
  disabled,
}: Props) {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = getColors(scheme);

  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary
          ? {
              backgroundColor: "#020202",
            }
          : {
              backgroundColor: "#FFFFFF",
              borderColor: C.chipBorder,
              borderWidth: 1.4,
            },
        pressed && !disabled ? styles.pressed : null,
        disabled ? { opacity: 0.6 } : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: isPrimary ? "#FFFFFF" : "#020202" },
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const T = Tokens;

const styles = StyleSheet.create({
  base: {
    height: T.size.buttonH,
    borderRadius: T.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  label: {
    fontFamily: T.font.semiFamily ?? T.font.family,
    fontSize: T.font.buttonSize,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
