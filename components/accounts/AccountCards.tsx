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

type AccountHeroCardProps = {
  title: string;
  balance: string;
  color: string;
  metaRows: { label: string; value: string }[];
  isSelected?: boolean;
  onPress?: () => void;
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
      <View pointerEvents="none" style={styles.waveImageWrapper}>
        <Image
          source={require("../../assets/images/accounts-vector.png")}
          style={[
            styles.waveImage,
            { transform: [{ rotate: `${waveAngle}deg` }] },
          ]}
          resizeMode="cover"
        />
      </View>
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

export function AccountHeroCard({
  title,
  balance,
  color,
  metaRows,
  isSelected = true,
  onPress,
}: AccountHeroCardProps) {
  return (
    <View style={[styles.heroShadow, { backgroundColor: color }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.heroCard,
          {
            backgroundColor: color,
            opacity: (pressed ? 0.9 : 1) * (isSelected ? 1 : 0.86),
          },
        ]}
      >
        <View pointerEvents="none" style={styles.heroGlow} />
        <View pointerEvents="none" style={styles.heroRing} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleGroup}>
            <ThemedText style={styles.heroTitle}>{title}</ThemedText>
          </View>
          <View style={styles.heroChip} />
        </View>
        <ThemedText style={styles.heroBalance}>{balance}</ThemedText>
        <View style={styles.heroMetaGrid}>
          {metaRows.map((row) => (
            <View key={row.label} style={styles.heroDetailRow}>
              <ThemedText style={styles.heroDetailLabel}>{row.label}</ThemedText>
              <ThemedText style={styles.heroDetailValue}>{row.value}</ThemedText>
            </View>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 4,
    gap: 6,
  },
  listTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  listBalance: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
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
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 4,
    minHeight: 140,
    overflow: "hidden",
  },
  waveImageWrapper: {
    ...StyleSheet.absoluteFillObject,
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
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  waveBalance: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
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
  heroShadow: {
    borderRadius: 22,
    width: "100%",
    shadowColor: "#1B2035",
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  heroCard: {
    borderRadius: 22,
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
    minHeight: 170,
  },
  heroGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 20,
    opacity: 0.7,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroRing: {
    position: "absolute",
    bottom: -80,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    opacity: 0.5,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTitleGroup: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    color: "#F6F6F6",
    fontSize: 17.5,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    letterSpacing: 0.3,
  },
  heroChip: {
    width: 40,
    height: 28,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  heroBalance: {
    color: "#FFFFFF",
    fontSize: 30,
    paddingTop: 10,
    marginTop: -2,
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
    letterSpacing: 0.35,
  },
  heroMetaGrid: {
    marginTop: 12,
    gap: 4,
  },
  heroDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 1,
  },
  heroDetailLabel: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12.5,
    fontFamily: Tokens.font.family,
  },
  heroDetailValue: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    letterSpacing: 0.2,
  },
});
