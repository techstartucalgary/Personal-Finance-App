import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

import { getBrandStyle } from "@/components/accounts/AccountCardCarousel";
import { ThemedText } from "@/components/themed-text";
import { Tokens } from "@/constants/authTokens";
import { tabsTheme } from "@/constants/tabsTheme";
import type { PlaidAccount } from "@/utils/plaid";

import { AccountsEmptyState } from "./AccountsEmptyState";
import type { AccountRow } from "./types";

type Ui = typeof tabsTheme.ui;

type AccountsAllViewProps = {
  ui: Ui;
  isLoading: boolean;
  filteredManualAccounts: AccountRow[];
  filteredPlaidAccounts: PlaidAccount[];
  searchQuery: string;
  manualCount: number;
  formatMoney: (amount: number) => string;
  getAccountColor: (item: AccountRow | PlaidAccount, index: number) => string;
  onOpenSingleAccount: (id: string) => void;
};

type AllAccountCardProps = {
  color: string;
  title: string;
  typeLabel: string;
  subtitle: string;
  balance: string;
  sourceLabel: string;
  institutionName?: string | null;
  mask?: string | null;
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
};

const CHEVRON_TIMING_CONFIG = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
};

const ACCORDION_OPEN_HEIGHT_TIMING_CONFIG = {
  duration: 190,
  easing: Easing.out(Easing.cubic),
};

const ACCORDION_CLOSE_HEIGHT_TIMING_CONFIG = {
  duration: 200,
  easing: Easing.inOut(Easing.quad),
};

const ACCORDION_OPEN_OPACITY_TIMING_CONFIG = {
  duration: 130,
  easing: Easing.out(Easing.quad),
};

const ACCORDION_CLOSE_OPACITY_TIMING_CONFIG = {
  duration: 180,
  easing: Easing.inOut(Easing.quad),
};

function SectionChevron({
  collapsed,
  color,
}: {
  collapsed: boolean;
  color: string;
}) {
  const rotation = useSharedValue(collapsed ? 0 : 1);

  useEffect(() => {
    rotation.value = withTiming(collapsed ? 0 : 1, CHEVRON_TIMING_CONFIG);
  }, [collapsed, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather name="chevron-down" size={18} color={color} />
    </Animated.View>
  );
}

function AccordionBody({
  expanded,
  borderColor,
  children,
}: {
  expanded: boolean;
  borderColor: string;
  children: React.ReactNode;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(expanded ? contentHeight : 0);
  const opacity = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(
      expanded ? contentHeight : 0,
      expanded ? ACCORDION_OPEN_HEIGHT_TIMING_CONFIG : ACCORDION_CLOSE_HEIGHT_TIMING_CONFIG
    );
    opacity.value = withTiming(
      expanded ? 1 : 0,
      expanded ? ACCORDION_OPEN_OPACITY_TIMING_CONFIG : ACCORDION_CLOSE_OPACITY_TIMING_CONFIG
    );
  }, [contentHeight, expanded, height, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: "hidden",
  }));

  return (
    <Animated.View
      pointerEvents={expanded ? "auto" : "none"}
      style={animatedStyle}
    >
      <View
        onLayout={(event) => {
          const nextHeight = Math.ceil(event.nativeEvent.layout.height);
          if (nextHeight !== contentHeight) {
            setContentHeight(nextHeight);
          }
        }}
        style={[
          localStyles.sectionContent,
          { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: borderColor },
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );
}

function AllAccountCard({
  color,
  title,
  typeLabel,
  subtitle,
  balance,
  sourceLabel,
  institutionName,
  mask,
  icon,
  onPress,
}: AllAccountCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.card,
        { backgroundColor: color, opacity: pressed ? 0.93 : 1 },
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={require("../../../assets/images/accounts-vector.png")}
          style={localStyles.waveImage}
          resizeMode="cover"
        />
      </View>

      <View style={localStyles.topRow}>
        <View style={localStyles.titleGroup}>
          <ThemedText style={localStyles.eyebrow}>{sourceLabel}</ThemedText>
          <ThemedText style={localStyles.cardName} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </ThemedText>
          <View style={localStyles.metaRow}>
            <ThemedText style={localStyles.metaText} numberOfLines={1} ellipsizeMode="tail">
              {institutionName || typeLabel}
            </ThemedText>
            {mask ? (
              <>
                <View style={localStyles.metaDot} />
                <ThemedText style={localStyles.metaText}>•••• {mask}</ThemedText>
              </>
            ) : null}
          </View>
        </View>
        <View style={localStyles.iconCircle}>
          <Feather name={icon} size={17} color="#FFFFFF" />
        </View>
      </View>

      <View style={localStyles.balanceBlock}>
        <ThemedText style={localStyles.balance}>{balance}</ThemedText>
      </View>

      <View style={localStyles.bottomRow}>
        <View style={localStyles.bottomMeta}>
          <ThemedText style={localStyles.subtitle} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </ThemedText>
        </View>
        <View style={localStyles.sourceChip}>
          <ThemedText style={localStyles.sourceChipText}>{sourceLabel}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

// Full list view for all accounts + linked banks.
export function AccountsAllView({
  ui,
  isLoading,
  filteredManualAccounts,
  filteredPlaidAccounts,
  searchQuery,
  manualCount,
  formatMoney,
  getAccountColor,
  onOpenSingleAccount,
}: AccountsAllViewProps) {
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const [linkedCollapsed, setLinkedCollapsed] = useState(false);
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!isSearching) return;
    if (filteredManualAccounts.length > 0) setManualCollapsed(false);
    if (filteredPlaidAccounts.length > 0) setLinkedCollapsed(false);
  }, [filteredManualAccounts.length, filteredPlaidAccounts.length, isSearching]);

  return (
    <View style={localStyles.root}>
      <Animated.View
        style={[localStyles.sectionPanel, { backgroundColor: ui.surface, borderColor: ui.border }]}
      >
        <Pressable
          onPress={() => setManualCollapsed((prev) => !prev)}
          style={localStyles.sectionToggle}
        >
          <ThemedText style={[localStyles.sectionTitle, { color: ui.text }]}>
            Self Managed
          </ThemedText>
          <View style={localStyles.sectionToggleRight}>
            <ThemedText style={[localStyles.sectionSubtitle, { color: ui.mutedText }]}>
              {filteredManualAccounts.length}
            </ThemedText>
            <SectionChevron collapsed={manualCollapsed} color={ui.mutedText} />
          </View>
        </Pressable>

        <AccordionBody expanded={!manualCollapsed} borderColor={ui.border}>
          {filteredManualAccounts.length === 0 ? (
            <AccountsEmptyState
              ui={ui}
              message={isLoading ? "Loading..." : "No matches found."}
            />
          ) : (
            <View style={localStyles.cardStack}>
              {filteredManualAccounts.map((item, idx) => (
                <AllAccountCard
                  key={item.id}
                  color={getAccountColor(item, idx)}
                  title={item.account_name ?? "Unnamed account"}
                  typeLabel={item.account_type
                    ? item.account_type.charAt(0).toUpperCase() + item.account_type.slice(1)
                    : "Account"}
                  subtitle={item.currency ?? "CAD"}
                  balance={formatMoney(item.balance ?? 0)}
                  sourceLabel="Manual"
                  icon="credit-card"
                  onPress={() => onOpenSingleAccount(`manual:${item.id}`)}
                />
              ))}
            </View>
          )}
        </AccordionBody>
      </Animated.View>

      <Animated.View
        style={[localStyles.sectionPanel, { backgroundColor: ui.surface, borderColor: ui.border }]}
      >
        <Pressable
          onPress={() => setLinkedCollapsed((prev) => !prev)}
          style={localStyles.sectionToggle}
        >
          <ThemedText style={[localStyles.sectionTitle, { color: ui.text }]}>
            Linked
          </ThemedText>
          <View style={localStyles.sectionToggleRight}>
            <ThemedText style={[localStyles.sectionSubtitle, { color: ui.mutedText }]}>
              {filteredPlaidAccounts.length}
            </ThemedText>
            <SectionChevron collapsed={linkedCollapsed} color={ui.mutedText} />
          </View>
        </Pressable>

        <AccordionBody expanded={!linkedCollapsed} borderColor={ui.border}>
          {filteredPlaidAccounts.length === 0 ? (
            <AccountsEmptyState
              ui={ui}
              message={isLoading ? "Loading..." : "No linked accounts found."}
            />
          ) : (
            <View style={localStyles.cardStack}>
              {filteredPlaidAccounts.map((pa, idx) => {
                const defaultColor = getAccountColor(pa, idx + manualCount);
                const brandColor = getBrandStyle(pa.institution_name)?.color || defaultColor;
                const typeLabel = pa.type
                  ? pa.type.charAt(0).toUpperCase() + pa.type.slice(1)
                  : "Account";
                const subtitle = pa.subtype
                  ? pa.subtype.charAt(0).toUpperCase() + pa.subtype.slice(1)
                  : "Bank";

                return (
                  <AllAccountCard
                    key={pa.account_id}
                    color={brandColor}
                    title={pa.name}
                    typeLabel={typeLabel}
                    subtitle={subtitle}
                    balance={formatMoney(pa.balances.current ?? 0)}
                    sourceLabel="Plaid"
                    institutionName={pa.institution_name}
                    mask={pa.mask}
                    icon="link"
                    onPress={() => onOpenSingleAccount(`plaid:${pa.account_id}`)}
                  />
                );
              })}
            </View>
          )}
        </AccordionBody>
      </Animated.View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  root: {
    gap: 14,
  },
  sectionPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    overflow: "hidden",
  },
  sectionToggle: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sectionToggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: Tokens.font.family,
  },
  cardStack: {
    gap: 12,
  },
  card: {
    minHeight: 154,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
    justifyContent: "space-between",
    boxShadow: "0 10px 15px rgba(0, 0, 0, 0.25)",
  },
  waveImage: {
    position: "absolute",
    width: 360,
    height: 180,
    right: -30,
    top: 54,
    opacity: 0.72,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    minHeight: 48,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 10.5,
    lineHeight: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 21,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.36)",
  },
  metaText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11.5,
    lineHeight: 14,
    fontFamily: Tokens.font.family,
    flexShrink: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceBlock: {
    marginTop: 6,
  },
  balance: {
    color: "#FFFFFF",
    fontSize: 29,
    lineHeight: 33,
    fontVariant: ["tabular-nums"],
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.family,
  },
  bottomRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bottomMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12.5,
    lineHeight: 15,
    fontFamily: Tokens.font.family,
  },
  sourceChip: {
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  sourceChipText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
});
