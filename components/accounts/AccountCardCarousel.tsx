import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

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
  /** e.g. "RBC", "TD", etc. */
  institutionName?: string | null;
  /** last 4 digits */
  mask?: string | null;
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

// ── Brand Logic ────────────────────────────────────

function getBrandStyle(institutionName?: string | null) {
  if (!institutionName) return null;
  const name = institutionName.toLowerCase();

  // Canadian Banks
  if (name.includes("rbc") || name.includes("royal bank")) return { color: "#005DAA", brand: "RBC" };
  if (name.includes("td") || name.includes("toronto-dominion")) return { color: "#008A00", brand: "TD" };
  if (name.includes("cibc")) return { color: "#9C2434", brand: "CIBC" };
  if (name.includes("bmo") || name.includes("bank of montreal")) return { color: "#0079C1", brand: "BMO" };
  if (name.includes("scotia") || name.includes("scotiabank")) return { color: "#EE0000", brand: "Scotia" };
  if (name.includes("tangerine")) return { color: "#FF671B", brand: "Tangerine" };
  if (name.includes("wealthsimple")) return { color: "#000000", brand: "Wealthsimple" };
  if (name.includes("desjardins")) return { color: "#008135", brand: "Desjardins" };

  // US Banks
  if (name.includes("chase") || name.includes("jpmorgan")) return { color: "#117ACA", brand: "Chase" };
  if (name.includes("american express") || name.includes("amex")) return { color: "#0070D2", brand: "AMEX" };
  if (name.includes("capital one")) return { color: "#003A70", brand: "Cap1" };
  if (name.includes("bank of america") || name.includes("bofa")) return { color: "#E61A2A", brand: "BofA" };
  if (name.includes("wells fargo")) return { color: "#D71E28", brand: "Wells" };
  if (name.includes("citi")) return { color: "#003B70", brand: "Citi" };

  return null;
}

// ── Account Card ──────────────────────────────────

function AccountCard({
  item,
  isDark,
}: {
  item: UnifiedAccount;
  isDark: boolean;
}) {
  const brand = getBrandStyle(item.institutionName);
  const brandKey = brand?.brand ?? null;
  const hasBrand = Boolean(brandKey);
  const cardColor = brand?.color || item.color;

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
        opacity: hasBrand ? 0.08 : 0.12 + next() * 0.2, // Subtler patterns for brand cards
        isRing: next() > 0.4,
      };
    });
  }, [item.key, hasBrand]);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: cardColor,
        borderColor: borderColor,
        borderWidth: 1,
        shadowColor: cardColor,
        shadowOpacity: shadowOpacity,
        shadowRadius: shadowRadius,
        elevation: 8, // Fix for Android shadows
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
        {!brand && (
          <Image
            source={require("../../assets/images/accounts-vector.png")}
            style={styles.waveImage}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Top: name & icon */}
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <ThemedText style={styles.cardName}>{item.name}</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {item.institutionName ? (
              <ThemedText style={[styles.typePillText, { fontWeight: '600', color: '#FFFFFF', opacity: 0.9 }]}>
                {item.institutionName}
              </ThemedText>
            ) : (
              <ThemedText style={styles.typePillText}>{item.typeLabel}</ThemedText>
            )}
            {item.mask && (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                <ThemedText style={[styles.typePillText, { opacity: 0.8 }]}>•••• {item.mask}</ThemedText>
              </>
            )}
          </View>
        </View>
        <View style={styles.iconCircle}>
          <Feather
            name={item.kind === "plaid" ? "link" : "credit-card"}
            size={18}
            color="#FFFFFF"
          />
        </View>
      </View>

      {/* Balance Section Allocation Placeholder */}
      <View style={{ height: 20 }} />

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

const AccountCardCarouselComponent = ({
  accounts,
  activeIndex,
  onIndexChange,
  onAddPress,
  onAccountPress,
  ui,
}: Props) => {
  const background = ui.background ?? ui.bg;
  const isDark =
    ui.text === "#FFFFFF" || background === "#000000" || background === "#1C1C1E";
  const flatListRef = useRef<FlatList>(null);

  // Continuous scroll position for pagination dots
  const scrollX = useSharedValue(0);
  // Tracks the last index we fired a haptic for
  const lastHapticIndex = useSharedValue(activeIndex);

  const [dotsContainerWidth, setDotsContainerWidth] = React.useState(0);

  const scrollToIndex = useCallback((index: number) => {
    if (index >= 0 && index < accounts.length) {
      if (index !== lastHapticIndex.value) {
        lastHapticIndex.value = index;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      flatListRef.current?.scrollToOffset({
        offset: index * ITEM_WIDTH,
        animated: false,
      });
    }
  }, [accounts.length, lastHapticIndex]);

  useEffect(() => {
    if (!accounts.length) return;
    scrollToIndex(activeIndex);
  }, [activeIndex, accounts.length, scrollToIndex]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(0)
      .runOnJS(true)
      .onBegin((e) => {
        if (dotsContainerWidth === 0 || accounts.length === 0) return;
        const boundedX = Math.max(0, Math.min(e.x, dotsContainerWidth));
        const percentage = boundedX / dotsContainerWidth;
        const targetIndex = Math.min(
          accounts.length - 1,
          Math.max(0, Math.round(percentage * (accounts.length - 1)))
        );
        scrollToIndex(targetIndex);
      })
      .onUpdate((e) => {
        if (dotsContainerWidth === 0 || accounts.length === 0) return;
        const boundedX = Math.max(0, Math.min(e.x, dotsContainerWidth));
        const percentage = boundedX / dotsContainerWidth;
        const targetIndex = Math.min(
          accounts.length - 1,
          Math.max(0, Math.round(percentage * (accounts.length - 1)))
        );
        scrollToIndex(targetIndex);
      });
  }, [dotsContainerWidth, accounts.length, scrollToIndex]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;

      const idx = Math.round(event.contentOffset.x / ITEM_WIDTH);
      if (idx !== lastHapticIndex.value && idx >= 0 && idx < accounts.length) {
        lastHapticIndex.value = idx;
        runOnJS(onIndexChange)(idx);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  });

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: UnifiedAccount) => item.key, []);

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedAccount; index: number }) => (
      <AccountCardItem
        item={item}
        index={index}
        scrollX={scrollX}
        isDark={isDark}
        onAccountPress={onAccountPress}
      />
    ),
    [scrollX, isDark, onAccountPress]
  );

  return (
    <View style={styles.container}>
      {/* The real account cards */}
      <Animated.FlatList
        ref={flatListRef as any}
        data={accounts}
        keyExtractor={keyExtractor}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        pagingEnabled={Platform.OS === "ios"}
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="center"
        decelerationRate={Platform.OS === "ios" ? "fast" : 0.985}
        disableIntervalMomentum={true}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        initialNumToRender={3}
        windowSize={5}
        maxToRenderPerBatch={3}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={{ paddingRight: 0 }}
        style={{ overflow: "visible" }}
        renderItem={renderItem}
      />

      {/* Post-carousel footer controls */}
      <View style={styles.paginationContainer}>
        {accounts.length > 1 && (
          <GestureDetector gesture={panGesture}>
            <View 
              style={styles.dotsRow}
              onLayout={(e) => setDotsContainerWidth(e.nativeEvent.layout.width)}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              {accounts.map((acc, idx) => (
                <PaginationDot
                  key={acc.key}
                  index={idx}
                  scrollX={scrollX}
                  ui={ui}
                />
              ))}
            </View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
};

// ── Sub-components for Reanimated ─────────────────

const AccountCardItem = React.memo(({ item, index, scrollX, isDark, onAccountPress }: any) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.85, 1, 0.85],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );

    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [-25, 0, 25],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[{ width: ITEM_WIDTH, justifyContent: 'center' }, animatedStyle]}>
      <Pressable
        onPress={() => onAccountPress?.(item)}
        style={({ pressed }) => [
          {
            width: CARD_WIDTH,
            marginHorizontal: CARD_HORIZONTAL_MARGIN,
            paddingBottom: 10,
            transform: [{ scale: pressed ? 1.02 : 1 }],
          },
        ]}
      >
        <AccountCard item={item} isDark={isDark} />
      </Pressable>
    </Animated.View>
  );
});
AccountCardItem.displayName = "AccountCardItem";

const PaginationDot = React.memo(({ index, scrollX, ui }: any) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 22, 8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        { backgroundColor: ui.text },
      ]}
    />
  );
});
PaginationDot.displayName = "PaginationDot";

export const AccountCardCarousel = React.memo(
  AccountCardCarouselComponent,
  (prev, next) => {
    // Basic equality check for accounts and ui
    return prev.accounts === next.accounts && prev.ui === next.ui;
  }
);
AccountCardCarousel.displayName = "AccountCardCarousel";

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
  addButton: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
