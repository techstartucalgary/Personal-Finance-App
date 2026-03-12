import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";

type AccountCardProps = {
  title: string;
  balance: string;
  typeLabel: string;
  dateLabel: string;
  color: string;
  onPress?: () => void;
  waveAngle?: number;
};

export function AccountListCard({
  title,
  balance,
  typeLabel,
  dateLabel,
  color,
  onPress,
}: AccountCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listCard,
        { backgroundColor: color, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <ThemedText style={styles.listTitle}>{title}</ThemedText>
      <ThemedText style={styles.listBalance}>{balance}</ThemedText>
      <View style={styles.listMetaRow}>
        <ThemedText style={styles.listMetaText}>{typeLabel}</ThemedText>
        <ThemedText style={styles.listMetaText}>{dateLabel}</ThemedText>
      </View>
    </Pressable>
  );
}

export function AccountWaveCard({
  title,
  balance,
  typeLabel,
  dateLabel,
  color,
  onPress,
  waveAngle = -8,
}: AccountCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.waveCard,
        { backgroundColor: color, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Image
        pointerEvents="none"
        source={require("../../assets/images/accounts-vector.png")}
        style={[
          styles.waveImage,
          { transform: [{ rotate: `${waveAngle}deg` }] },
        ]}
        resizeMode="cover"
      />
      <View style={styles.waveTopRow}>
        <View style={styles.waveTitleGroup}>
          <ThemedText style={styles.waveTitle}>{title}</ThemedText>
          <ThemedText style={styles.waveBalance}>{balance}</ThemedText>
        </View>
        <View style={styles.waveIcon}>
          <Feather name="credit-card" size={18} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.waveMetaRow}>
        <ThemedText style={styles.waveMetaText}>{typeLabel}</ThemedText>
        <ThemedText style={styles.waveMetaText}>{dateLabel}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listCard: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 6,
  },
  listTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  listBalance: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  listMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listMetaText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontFamily: Tokens.font.family,
  },
  waveCard: {
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginTop: 10,
    minHeight: 140,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    overflow: "hidden",
  },
  waveImage: {
    position: "absolute",
    width: 360,
    height: 180,
    right: -30,
    top: 36,
    opacity: 0.95,
  },
  waveTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  waveTitleGroup: {
    flex: 1,
    gap: 6,
  },
  waveTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  waveBalance: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  waveIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  waveMetaRow: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  waveMetaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: Tokens.font.family,
  },
});
