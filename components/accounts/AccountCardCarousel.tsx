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
const CARD_GAP = 14;
const CARD_PEEK = 35;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PEEK * 2 - CARD_GAP * 2;
const ITEM_WIDTH = CARD_WIDTH + CARD_GAP;
const CAROUSEL_PADDING_LEFT = (SCREEN_WIDTH - ITEM_WIDTH) / 2;
const CAROUSEL_PADDING_RIGHT = CAROUSEL_PADDING_LEFT;

const CARD_HEIGHT = Math.max(178, Math.min(194, Math.round(CARD_WIDTH * 0.62)));
const IS_ANDROID = Platform.OS === "android";

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

// ── Brand Logic ────────────────────────────────────

export function getBrandStyle(institutionName?: string | null) {
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
  const cardColor = brand?.color || item.color;

  // Use a semi-transparent black for the border to slightly darken the background color
  const borderColor = isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";

  // Shadows need to be stronger/lighter in dark mode to appear like a luminous glow
  const shadowOpacity = isDark ? 0.6 : 0.35;
  const shadowRadius = isDark ? 16 : 12;

  return (
    <View style={[
      styles.cardShadow,
      {
        backgroundColor: cardColor,
        shadowColor: cardColor,
        shadowOpacity: shadowOpacity,
        shadowRadius: shadowRadius,
        elevation: 10,
      }
    ]}>
      <View style={[
        styles.cardInner,
        {
          borderColor: borderColor,
        }
      ]}>
        {/* Decorative elements (no interactions) */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
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
            <ThemedText
              style={styles.cardName}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.name}
            </ThemedText>
            <View style={styles.metaRow}>
              {item.institutionName ? (
                <ThemedText
                  style={styles.typePillText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.institutionName}
                </ThemedText>
              ) : (
                <ThemedText
                  style={styles.typePillText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.typeLabel}
                </ThemedText>
              )}
              {item.mask && (
                <>
                  <View style={styles.metaDot} />
                  <ThemedText style={styles.typePillText}>•••• {item.mask}</ThemedText>
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

        {/* Balance Section */}
        <View style={styles.balanceBlock}>
          <ThemedText style={styles.balance}>{item.balance}</ThemedText>
          {item.availableBalance && (
            <ThemedText style={styles.availableSubtitle}>
              Available to spend: {item.availableBalance}
            </ThemedText>
          )}
        </View>

        {/* Bottom subtitle */}
        <View style={styles.bottomRow}>
          <View style={styles.bottomMetaGroup}>
            <ThemedText
              style={styles.subtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.subtitle}
            </ThemedText>
          </View>
          {item.sourceLabel && (
            <View style={styles.sourceBadge}>
              <Feather
                name={item.kind === "manual" ? "edit-2" : "check"}
                size={10}
                color="rgba(255,255,255,0.82)"
              />
              <ThemedText style={styles.sourceBadgeText}>{item.sourceLabel}</ThemedText>
            </View>
          )}
        </View>
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
  const settledIndexRef = useRef(activeIndex);

  // Continuous scroll position for pagination dots
  const scrollX = useSharedValue(activeIndex * ITEM_WIDTH);
  const reportedIndex = useSharedValue(activeIndex);
  // Tracks the last index we fired a haptic for
  const lastHapticIndex = useSharedValue(activeIndex);

  const scrollToIndex = useCallback((index: number) => {
    if (index >= 0 && index < accounts.length) {
      scrollX.value = index * ITEM_WIDTH;
      flatListRef.current?.scrollToOffset({
        offset: index * ITEM_WIDTH,
        animated: false,
      });
    }
  }, [accounts.length, scrollX]);

  const commitIndex = useCallback((index: number) => {
    if (index < 0 || index >= accounts.length) return;
    if (index === settledIndexRef.current) return;
    settledIndexRef.current = index;
    reportedIndex.value = index;
    if (index !== lastHapticIndex.value) {
      lastHapticIndex.value = index;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onIndexChange(index);
  }, [accounts.length, lastHapticIndex, onIndexChange, reportedIndex]);

  useEffect(() => {
    if (!accounts.length) return;
    if (activeIndex === settledIndexRef.current) return;
    settledIndexRef.current = activeIndex;
    reportedIndex.value = activeIndex;
    scrollToIndex(activeIndex);
  }, [activeIndex, accounts.length, reportedIndex, scrollToIndex]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const nextIndex = Math.max(
        0,
        Math.min(accounts.length - 1, Math.round(event.contentOffset.x / ITEM_WIDTH))
      );

      if (nextIndex !== reportedIndex.value) {
        reportedIndex.value = nextIndex;
        runOnJS(commitIndex)(nextIndex);
      }
    },
  });

  const handleMomentumScrollEnd = useCallback((offsetX: number) => {
    const idx = Math.round(offsetX / ITEM_WIDTH);
    commitIndex(idx);
  }, [commitIndex]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: UnifiedAccount) => item.key, []);
  const snapOffsets = useMemo(
    () => accounts.map((_, index) => index * ITEM_WIDTH),
    [accounts],
  );

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
        pagingEnabled={!IS_ANDROID}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        getItemLayout={getItemLayout}
        initialScrollIndex={activeIndex}
        onScroll={handleScroll}
        onMomentumScrollEnd={(e) => handleMomentumScrollEnd(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        bounces={false}
        initialNumToRender={3}
        windowSize={5}
        maxToRenderPerBatch={3}
        removeClippedSubviews={false}
        contentContainerStyle={{
          paddingLeft: CAROUSEL_PADDING_LEFT,
          paddingRight: CAROUSEL_PADDING_RIGHT,
          paddingVertical: 5,
        }}
        style={styles.list}
        renderItem={renderItem}
      />
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
      [0.93, 1, 0.93],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.72, 1, 0.72],
      Extrapolation.CLAMP
    );

    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [-12, 0, 12],
      Extrapolation.CLAMP
    );

    const cardTransform: any[] = [
      { perspective: 1000 },
      { scale },
    ];

    if (Platform.OS !== "android") {
      cardTransform.splice(1, 0, { rotateY: `${rotateY}deg` });
    }

    return {
      opacity,
      transform: cardTransform,
    };
  });

  return (
    <Animated.View
      style={[
        { width: ITEM_WIDTH, justifyContent: "center", overflow: "visible" },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={() => onAccountPress?.(item)}
        style={({ pressed }) => [
          {
            width: CARD_WIDTH,
            marginHorizontal: CARD_GAP / 2,
            paddingVertical: 10, // Ensure shadow has room
          },
        ]}
      >
        <AccountCard item={item} isDark={isDark} />
      </Pressable>
    </Animated.View>
  );
});
AccountCardItem.displayName = "AccountCardItem";

export const AccountCardCarousel = React.memo(AccountCardCarouselComponent);
AccountCardCarousel.displayName = "AccountCardCarousel";

// ── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "visible",
    marginHorizontal: -16,
  },
  list: {
    overflow: "visible",
  },
  cardShadow: {
    borderRadius: 24,
    boxShadow: "0 10px 15px rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    overflow: "visible", // SHADOW MUST NOT CLIP
  },
  cardInner: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
    height: CARD_HEIGHT,
    overflow: "hidden", // CONTENT MUST CLIP (for wave image)
    justifyContent: "flex-start",
    gap: 10,
    borderCurve: "continuous",
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
    gap: 4,
    paddingRight: 12,
    minHeight: 52,
    minWidth: 0,
    overflow: "hidden",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 16,
    minWidth: 0,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.36)",
  },
  typePillText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: Tokens.font.family,
    flexShrink: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceBlock: {
    gap: 1,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.4,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  balance: {
    fontSize: 28,
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
    color: "#FFFFFF",
    lineHeight: 33,
    fontVariant: ["tabular-nums"],
  },
  availableSubtitle: {
    fontSize: 12.5,
    lineHeight: 15,
    color: "rgba(255,255,255,0.72)",
    fontFamily: Tokens.font.family,
  },
  bottomRow: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 10,
    minHeight: 34,
  },
  bottomMetaGroup: {
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  bottomLabel: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    lineHeight: 18,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexShrink: 0,
    alignSelf: "flex-end",
  },
  sourceBadgeText: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 10.5,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
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
