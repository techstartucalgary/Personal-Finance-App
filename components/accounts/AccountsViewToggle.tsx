import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

type ViewMode = "list" | "wave";

type AccountsViewToggleProps = {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
  borderColor: string;
  backgroundColor: string;
  activeColor: string;
  inactiveColor: string;
};

export function AccountsViewToggle({
  value,
  onChange,
  borderColor,
  backgroundColor,
  activeColor,
  inactiveColor,
}: AccountsViewToggleProps) {
  return (
    <View style={[styles.container, { borderColor, backgroundColor }]}>
      <Pressable
        onPress={() => onChange("list")}
        style={styles.button}
        hitSlop={6}
      >
        <Feather
          name="list"
          size={18}
          color={value === "list" ? activeColor : inactiveColor}
        />
      </Pressable>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
      <Pressable
        onPress={() => onChange("wave")}
        style={styles.button}
        hitSlop={6}
      >
        <Feather
          name="grid"
          size={18}
          color={value === "wave" ? activeColor : inactiveColor}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  button: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    opacity: 0.7,
  },
});
