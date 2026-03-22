import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_HORIZONTAL_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;
const ITEM_WIDTH = CARD_WIDTH + CARD_HORIZONTAL_MARGIN * 2;

const CARD_HEIGHT = 230;

// ── Types ──────────────────────────────────────────

export type UnifiedAccount = {
  /** Unique key for FlatList */
  key: string;
  /** "manual" | "plaid" */
  kind: "manual" | "plaid";
  /** Colour background for the card */
  color: string;
  /** Display name */
  name: string;
  /** Formatted balance string */
  balance: string;
  /** Optional formatted available balance string */
  availableBalance?: string;
  /** e.g. "Credit", "Debit", "Depository" */
  typeLabel: string;
  /** e.g. "CAD", "Checking", etc. */
  subtitle: string;
  /** e.g. "Manual", "Plaid" */
  sourceLabel?: string;
  /** Original account data */
  data: any | null;
};

type Props = {
  accounts: UnifiedAccount[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onAddPress: () => void;
  onAccountPress?: (account: UnifiedAccount) => void;
  ui: any;
};

// ── Utils ──────────────────────────────────────────
function adjustOpacity(rgba: string, opacity: number) {
  return rgba.replace(/,?\s*\d?\.?\d*\s*\)$/, `, ${opacity})`).replace(/rgb\(/, "rgba(");
}

function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  let currentHash = hash;
  return () => {
    currentHash = (currentHash * 9301 + 49297) % 233280;
    return currentHash / 233280;
  };
}

// ── Account Card ──────────────────────────────────

function AccountCard({
  item,
  isDark,
}: {
  item: UnifiedAccount;
  isDark: boolean;
}) {
  // Use a semi-transparent black for the border to slightly darken the background color
  const borderColor = isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";

  // Shadows need to be stronger/lighter in dark mode to appear like a luminous glow
  const shadowOpacity = isDark ? 0.6 : 0.35;
  const shadowRadius = isDark ? 16 : 12;

  // Generate deterministic random patterns based on the account key
  const circles = useMemo(() => {
    const next = seededRandom(item.key || "default");
    return Array.from({ length: 3 }).map((_, i) => {
      // Ensure the first circle is always mostly central so the card is never "empty"
      const isFirst = i === 0;
      return {
        id: i,
        size: isFirst ? 140 + next() * 100 : 100 + next() * 150,
        top: isFirst ? 10 + next() * 30 : next() * 70 - 10,
        left: isFirst ? 10 + next() * 50 : next() * 80 - 10,
        opacity: 0.12 + next() * 0.2,
        isRing: next() > 0.4,
      };
    });
  }, [item.key]);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: item.color,
        borderColor: borderColor,
        borderWidth: 1,
        shadowColor: item.color,
        shadowOpacity: shadowOpacity,
        shadowRadius: shadowRadius,
      }
    ]}>
      {/* Decorative elements (no interactions) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {circles.map((c) => (
          <View
            key={c.id}
            style={{
              position: "absolute",
              width: c.size,
              height: c.size,
              borderRadius: c.size / 2,
              top: `${c.top}%`,
              left: `${c.left}%`,
              backgroundColor: c.isRing ? "transparent" : "rgba(255,255,255,0.4)",
              borderWidth: c.isRing ? 1.5 : 0,
              borderColor: "rgba(255,255,255,0.25)",
              opacity: c.opacity,
            }}
          />
        ))}

        {/* Wave image */}
        <Image
          source={require("../../assets/images/accounts-vector.png")}
          style={styles.waveImage}
          resizeMode="cover"
        />
      </View>

      {/* Top: name & icon */}
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <ThemedText style={styles.cardName}>{item.name}</ThemedText>
          <ThemedText style={styles.typePillText}>{item.typeLabel}</ThemedText>
        </View>
        <View style={styles.iconCircle}>
          <Feather
            name={item.kind === "plaid" ? "link" : "credit-card"}
            size={18}
            color="#FFFFFF"
          />
        </View>
      </View>

      {/* Balance Section */}
      <View>
        <ThemedText style={styles.balance}>{item.balance}</ThemedText>
        {item.availableBalance && (
          <ThemedText style={styles.availableSubtitle}>
            {item.availableBalance} available
          </ThemedText>
        )}
      </View>

      {/* Bottom subtitle */}
      <View style={styles.bottomRow}>
        <ThemedText style={styles.subtitle}>{item.subtitle}</ThemedText>
        {item.sourceLabel && (
          <View style={styles.sourceBadge}>
            <Feather
              name={item.kind === "manual" ? "edit-2" : "check"}
              size={11}
              color="rgba(255,255,255,0.85)"
            />
            <ThemedText style={styles.sourceBadgeText}>{item.sourceLabel}</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Carousel ───────────────────────────────────────

export function AccountCardCarousel({
  accounts,
  activeIndex,
  onIndexChange,
  onAddPress,
  onAccountPress,
  ui,
}: Props) {
  const isDark = ui.text === "#FFFFFF" || ui.background === "#000000" || ui.background === "#1C1C1E";
  const flatListRef = useRef<FlatList>(null);
  // Continuous scroll position for pagination dots
  const scrollX = useRef(new Animated.Value(0)).current;
  // Tracks the last index we fired a haptic for
  const lastHapticIndex = useRef(activeIndex);

  // Snap offsets only at real card positions
  const snapOffsets = useMemo(
    () => accounts.map((_, i) => i * ITEM_WIDTH),
    [accounts.length],
  );

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;

        // Update the active card index in real time
        const idx = Math.round(offsetX / ITEM_WIDTH);
        if (idx !== lastHapticIndex.current && idx >= 0 && idx < accounts.length) {
          lastHapticIndex.current = idx;
          onIndexChange(idx);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

      },
    }
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedAccount, index: number }) => {
      const inputRange = [
        (index - 1) * ITEM_WIDTH,
        index * ITEM_WIDTH,
        (index + 1) * ITEM_WIDTH,
      ];

      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.85, 1, 0.85],
        extrapolate: "clamp",
      });

      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.4, 1, 0.4],
        extrapolate: "clamp",
      });

      const rotateY = scrollX.interpolate({
        inputRange,
        outputRange: ["-45deg", "0deg", "45deg"],
        extrapolate: "clamp",
      });

      return (
        <Animated.View style={{ width: ITEM_WIDTH, justifyContent: 'center', opacity, transform: [{ perspective: 1000 }, { rotateY }, { scale }] }}>
          <Pressable
            onPress={() => onAccountPress?.(item)}
            style={({ pressed }) => [
              {
                width: CARD_WIDTH,
                marginHorizontal: CARD_HORIZONTAL_MARGIN,
                paddingBottom: 10,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 1.02 : 1 }],
              },
            ]}
          >
            <AccountCard item={item} isDark={isDark} />
          </Pressable>
        </Animated.View>
      );
    },
    [isDark, onAccountPress, scrollX]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      {/* The real account cards */}
      <FlatList
        ref={flatListRef}
        data={accounts}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={true}
        snapToOffsets={snapOffsets}
        snapToAlignment="center"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        contentContainerStyle={{ paddingRight: 0 }}
        style={{ overflow: "visible" }}
      />

      {/* Post-carousel footer controls */}
      <View style={styles.paginationContainer}>
        {accounts.length > 1 && (
          <View style={styles.dotsRow}>
            {accounts.map((acc, idx) => {
              const inputRange = [
                (idx - 1) * ITEM_WIDTH,
                idx * ITEM_WIDTH,
                (idx + 1) * ITEM_WIDTH,
              ];

              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 22, 8],
                extrapolate: "clamp",
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={acc.key}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity,
                      backgroundColor: ui.text,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}

        {accounts.length > 0 && (
          <Pressable
            onPress={onAddPress}
            hitSlop={8}
            style={({ pressed }) => [
              {
                marginTop: accounts.length > 1 ? 22 : 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingHorizontal: 28,
                paddingVertical: 12,
                backgroundColor: ui.text,
                borderRadius: 24,
                opacity: pressed ? 0.85 : 1,
                alignSelf: 'center',
              },
            ]}
          >
            <Feather name="plus" size={16} color={isDark ? "#000000" : "#FFFFFF"} />
            <ThemedText style={{ fontSize: 15, color: isDark ? "#000000" : "#FFFFFF", fontWeight: "700" }}>
              Add New Account
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "visible",
  },
  card: {
    borderRadius: 24,
    boxShadow: "0 10px 15px rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    height: CARD_HEIGHT,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  waveImage: {
    position: "absolute",
    width: 360,
    height: 180,
    right: -30,
    top: 50,
    opacity: 0.9,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleGroup: {
    flex: 1,
    gap: 6,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  typePillText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    letterSpacing: 0.3,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  balance: {
    fontSize: 32,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.family,
    color: "#FFFFFF",
    marginTop: 4,
    marginBottom: 2,
    lineHeight: 40,
  },
  availableSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    marginTop: -2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontFamily: Tokens.font.family,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  sourceBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    letterSpacing: 0.3,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },

  paginationContainer: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
