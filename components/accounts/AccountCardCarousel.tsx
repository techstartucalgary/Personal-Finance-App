import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useRef } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_HORIZONTAL_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;

// ── Types ──────────────────────────────────────────

export type UnifiedAccount = {
  /** Unique key for FlatList */
  key: string;
  /** "manual" | "plaid" | "add" */
  kind: "manual" | "plaid" | "add";
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
  /** Original account data — null for the "add" card */
  data: any | null;
};

type Props = {
  accounts: UnifiedAccount[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onAddPress: () => void;
  ui: any;
};

// ── Card ───────────────────────────────────────────

function AccountCard({ item }: { item: UnifiedAccount }) {
  if (item.kind === "add") {
    return (
      <View style={[styles.card, styles.addCard, { borderColor: "rgba(150,150,150,0.3)" }]}>
        <View style={styles.addIconCircle}>
          <Feather name="plus" size={32} color="rgba(150,150,150,0.7)" />
        </View>
        <ThemedText style={styles.addLabel}>Add Account</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: item.color }]}>
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
          <View style={styles.typePill}>
            <ThemedText style={styles.typePillText}>{item.typeLabel}</ThemedText>
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

      {/* Balance */}
      <ThemedText style={styles.balance}>{item.balance}</ThemedText>

      {/* Bottom subtitle */}
      <View style={styles.bottomRow}>
        <ThemedText style={styles.subtitle}>{item.subtitle}</ThemedText>
        {item.kind === "plaid" && (
          <View style={styles.plaidBadge}>
            <Feather name="check-circle" size={12} color="rgba(255,255,255,0.85)" />
            <ThemedText style={styles.plaidBadgeText}>Linked</ThemedText>
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
  ui,
}: Props) {
  const flatListRef = useRef<FlatList>(null);
  const itemWidth = CARD_WIDTH + CARD_HORIZONTAL_MARGIN * 2;

  // Use onMomentumScrollEnd to detect page changes — avoids the
  // "onViewableItemsChanged changed after initial render" warning
  const handleScrollEnd = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / itemWidth);
      if (idx !== activeIndex && idx >= 0 && idx < accounts.length) {
        onIndexChange(idx);
        if (accounts[idx]?.kind === "add") {
          onAddPress();
        }
      }
    },
    [itemWidth, activeIndex, accounts, onIndexChange, onAddPress],
  );

  const renderItem = useCallback(
    ({ item }: { item: UnifiedAccount }) => (
      <View style={{ width: CARD_WIDTH, marginHorizontal: CARD_HORIZONTAL_MARGIN }}>
        <AccountCard item={item} />
      </View>
    ),
    [],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: itemWidth,
      offset: itemWidth * index,
      index,
    }),
    [itemWidth],
  );

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={accounts}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingRight: 0 }}
      />

      {/* Pagination dots */}
      {accounts.length > 1 && (
        <View style={styles.dotsRow}>
          {accounts.map((acc, idx) => (
            <View
              key={acc.key}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    idx === activeIndex
                      ? ui.text
                      : ui.text + "30",
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 220,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  addCard: {
    borderWidth: 2,
    borderStyle: "dashed",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  addIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(150,150,150,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    fontSize: 16,
    color: "rgba(150,150,150,0.7)",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
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
    fontSize: 18,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  typePill: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  typePillText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 11,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    letterSpacing: 0.3,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  balance: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    marginTop: 8,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: Tokens.font.family,
  },
  plaidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  plaidBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
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
