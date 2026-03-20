import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
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

// How far into the footer the user must scroll to trigger the add
const ADD_TRIGGER_THRESHOLD = 200;
const CARD_HEIGHT = 230;
// Width of the scrollable footer zone (generous space for a full pull)
const FOOTER_WIDTH = ITEM_WIDTH * 1.2;
// Progressive appearance thresholds
const ICON_APPEAR_THRESHOLD = 60;     // Show just the "+" icon
const TEXT_APPEAR_THRESHOLD = 120;     // Show icon + "Add Account" text
// ADD_TRIGGER_THRESHOLD = 100        // Text changes to "Release to add"

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
  ui: any;
};

// ── Utils ──────────────────────────────────────────
function adjustOpacity(rgba: string, opacity: number) {
  return rgba.replace(/,?\s*\d?\.?\d*\s*\)$/, `, ${opacity})`).replace(/rgb\(/, "rgba(");
}

// ── Account Card ──────────────────────────────────

function AccountCard({ item, isDark }: { item: UnifiedAccount; isDark: boolean }) {
  // Use a semi-transparent black for the border to slightly darken the background color
  const borderColor = isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)";

  // Shadows need to be stronger/lighter in dark mode to appear like a luminous glow
  const shadowOpacity = isDark ? 0.6 : 0.35;
  const shadowRadius = isDark ? 16 : 12;

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
      {/* Decorative elements */}
      <View style={[styles.glow, { backgroundColor: item.color }]} />
      <View style={styles.ring} />

      {/* Wave image */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
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

      {/* Balance */}
      <ThemedText style={styles.balance}>{item.balance}</ThemedText>

      {/* Bottom subtitle */}
      <View style={styles.bottomRow}>
        <ThemedText style={styles.subtitle}>{item.subtitle}</ThemedText>
        {item.sourceLabel && (
          <View style={styles.sourceBadge}>
            <Feather
              name={item.kind === "manual" ? "edit-2" : "check-circle"}
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

// ── Animated Add Card ──────────────────────────────

function AddCard({
  widthAnim,
  overscrollRaw,
  ui,
  marginRightAnim,
}: {
  widthAnim: Animated.AnimatedInterpolation<number>;
  overscrollRaw: number;
  ui: any;
  marginRightAnim: Animated.AnimatedInterpolation<number>;
}) {
  // Progressive content based on how far the user has pulled
  const showIcon = overscrollRaw >= ICON_APPEAR_THRESHOLD;
  const showText = overscrollRaw >= TEXT_APPEAR_THRESHOLD;
  const pastThreshold = overscrollRaw >= ADD_TRIGGER_THRESHOLD;

  // Overall opacity: fade in starting from 0
  const opacity = overscrollRaw <= 0 ? 0 : Math.min(1, overscrollRaw / ICON_APPEAR_THRESHOLD);

  // Background color based on pull state and theme
  const isDark = ui.text === "#FFFFFF" || ui.background === "#000000" || ui.background === "#1C1C1E";
  const defaultBg = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
  const triggerBg = "rgba(34, 197, 94, 0.15)";
  const triggerBorder = "rgba(34, 197, 94, 0.4)";

  return (
    <Animated.View
      style={[
        styles.addCardOuter,
        {
          width: widthAnim,
          opacity,
        },
      ]}
    >
      <Animated.View style={[
        styles.addCardInner,
        {
          backgroundColor: pastThreshold ? triggerBg : defaultBg,
          borderColor: pastThreshold ? triggerBorder : "rgba(164, 164, 164, 0.4)",
          marginRight: marginRightAnim,
        }
      ]}>
        {showIcon && !showText && (
          <Feather name="plus" size={28} color="rgba(150,150,150,0.8)" />
        )}
        {showText && !pastThreshold && (
          <View style={{ alignItems: "center", gap: 8 }}>
            <View style={styles.addIconCircle}>
              <Feather name="plus" size={28} color="rgba(150,150,150,0.8)" />
            </View>
            <ThemedText style={styles.addLabel}>Add Account</ThemedText>
          </View>
        )}
        {pastThreshold && (
          <View style={{ alignItems: "center", gap: 8 }}>
            <View style={[styles.addIconCircle, { borderColor: "rgba(100,200,100,0.5)" }]}>
              <Feather name="check" size={24} color="rgba(100,200,100,0.9)" />
            </View>
            <ThemedText style={[styles.addLabel, { color: "rgba(100,200,100,0.9)" }]}>
              Release to add
            </ThemedText>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ── Carousel ───────────────────────────────────────

export function AccountCardCarousel({
  accounts,
  activeIndex,
  onIndexChange,
  onAddPress,
  ui,
}: Props) {
  const isDark = ui.text === "#FFFFFF" || ui.background === "#000000" || ui.background === "#1C1C1E";
  const flatListRef = useRef<FlatList>(null);
  const [overscrollRaw, setOverscrollRaw] = useState(0);
  const [isTriggering, setIsTriggering] = useState(false);

  // Animated value for the overscroll distance
  const overscrollAnim = useRef(new Animated.Value(0)).current;
  // Continuous scroll position for pagination dots
  const scrollX = useRef(new Animated.Value(0)).current;

  // The max scroll offset for the real accounts
  const maxScrollOffset = Math.max(0, (accounts.length - 1)) * ITEM_WIDTH;

  // Snap offsets only at real card positions (no snap in footer zone)
  const snapOffsets = useMemo(
    () => accounts.map((_, i) => i * ITEM_WIDTH),
    [accounts.length],
  );

  // Width of add card: 1:1 tracking with overscroll
  const addCardWidth = overscrollAnim.interpolate({
    inputRange: [0, ITEM_WIDTH],
    outputRange: [0, ITEM_WIDTH],
    extrapolate: "clamp",
  });

  // Margin of the inner card: collapses as it fills the screen
  const addCardMarginRight = overscrollAnim.interpolate({
    inputRange: [ADD_TRIGGER_THRESHOLD, ITEM_WIDTH],
    outputRange: [CARD_HORIZONTAL_MARGIN, 0],
    extrapolate: "clamp",
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;

        // Update the active card index in real time
        const idx = Math.round(offsetX / ITEM_WIDTH);
        if (idx !== activeIndex && idx >= 0 && idx < accounts.length) {
          onIndexChange(idx);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Drive the overscroll animated value + raw state for progressive text
        const overscroll = Math.max(0, offsetX - maxScrollOffset);
        overscrollAnim.setValue(overscroll);
        setOverscrollRaw(overscroll);
      },
    }
  );

  const handleTriggerAdd = useCallback(() => {
    if (isTriggering) return;
    setIsTriggering(true);

    // Scroll the FlatList to position the footer flush with the card zone
    flatListRef.current?.scrollToOffset({
      offset: maxScrollOffset + ITEM_WIDTH,
      animated: true,
    });

    // Expand the dashed card to fill exactly one card slot
    Animated.timing(overscrollAnim, {
      toValue: ITEM_WIDTH,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // Brief pause so the user sees the full card, then show the sheet
      setTimeout(() => {
        onAddPress();

        // After the modal is up, scroll back and reset
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: maxScrollOffset,
            animated: false,
          });
          overscrollAnim.setValue(0);
          setOverscrollRaw(0);
          setIsTriggering(false);
        }, 200);
      }, 200);
    });
  }, [isTriggering, maxScrollOffset, onAddPress, overscrollAnim]);

  const handleScrollEndDrag = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const overscroll = offsetX - maxScrollOffset;

      if (overscroll >= ADD_TRIGGER_THRESHOLD) {
        handleTriggerAdd();
      } else {
        // The FlatList will snap back to the nearest snapToOffset automatically
        // Just reset the overscroll animation
        Animated.spring(overscrollAnim, {
          toValue: 0,
          useNativeDriver: false,
          tension: 100,
          friction: 12,
        }).start();
        setOverscrollRaw(0);
      }
    },
    [handleTriggerAdd, maxScrollOffset, overscrollAnim],
  );

  // Also reset overscroll when momentum completes (covers cases where
  // the snap-to-offset bounce ends after the drag handler)
  const handleMomentumEnd = useCallback(
    (event: any) => {
      if (isTriggering) return;

      const offsetX = event.nativeEvent.contentOffset.x;
      const overscroll = offsetX - maxScrollOffset;

      if (overscroll >= ADD_TRIGGER_THRESHOLD) {
        handleTriggerAdd();
      } else {
        overscrollAnim.setValue(0);
        setOverscrollRaw(0);
      }
    },
    [handleTriggerAdd, isTriggering, maxScrollOffset, overscrollAnim],
  );

  const renderItem = useCallback(
    ({ item }: { item: UnifiedAccount }) => (
      <View style={{ width: CARD_WIDTH, marginHorizontal: CARD_HORIZONTAL_MARGIN, paddingBottom: 10 }}>
        <AccountCard item={item} isDark={isDark} />
      </View>
    ),
    [isDark],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    [],
  );

  const footer = useMemo(
    () => <View style={{ width: FOOTER_WIDTH }} />,
    [],
  );

  return (
    <View style={styles.container}>
      {/* The real account cards + footer spacer */}
      <FlatList
        ref={flatListRef}
        data={accounts}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumEnd}
        bounces={false}
        ListFooterComponent={footer}
        contentContainerStyle={{ paddingRight: 0, paddingVertical: 20 }}
        style={{ overflow: "visible" }}
      />

      {/* Peeking add card — positioned to the right of the FlatList */}
      <View style={styles.addCardSlot} pointerEvents="none">
        <AddCard
          widthAnim={addCardWidth}
          overscrollRaw={overscrollRaw}
          ui={ui}
          marginRightAnim={addCardMarginRight}
        />
      </View>

      {/* Pagination dots */}
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
          {/* Plus sign at the end of dots to indicate 'more' */}
          <View style={{ marginLeft: 6, opacity: 0.5 }}>
            <Feather name="chevron-right" size={14} color={ui.mutedText} />
          </View>
        </View>
      )}
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
  glow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.35,
  },
  ring: {
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
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    lineHeight: 40,
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
  // ── Add card ──
  addCardSlot: {
    position: "absolute",
    top: 20,
    right: 0,
    height: CARD_HEIGHT,
    justifyContent: "center",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  addCardOuter: {
    height: "100%",
    overflow: "hidden",
  },
  addCardInner: {
    flex: 1,
    marginLeft: 8,
    marginRight: CARD_HORIZONTAL_MARGIN,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(164, 164, 164, 0.4)",
    backgroundColor: "rgba(130,130,130,0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  addIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(150,150,150,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    fontSize: 13,
    color: "rgba(150,150,150,0.8)",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    marginBottom: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
