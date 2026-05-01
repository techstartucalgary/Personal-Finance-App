import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  LinkExit,
  LinkSuccess,
  create as plaidCreate,
  destroy as plaidDestroy,
  open as plaidOpen,
} from "react-native-plaid-link-sdk";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { exchangePublicToken, getLinkToken } from "@/utils/plaid";

export default function AddAccountSourceScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const ui = useThemeUI();
  const [isConnecting, setIsConnecting] = useState(false);
  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E";
  const pageBackground = isDark ? ui.surface : "#F2F2F7";
  const optionBackground = isDark ? ui.surface2 : "#FFFFFF";
  const iconChipBackground = isDark
    ? Platform.OS === "ios"
      ? ui.surface
      : ui.bg
    : "#F2F2F7";
  const subtleBorder = ui.border;
  const heroBadgeBackground = isDark ? "rgba(255,255,255,0.08)" : ui.accentSoft;
  const connectCardBackground = useMemo(
    () => (isDark ? "#232327" : "#FFFFFF"),
    [isDark],
  );

  const handleConnectBank = useCallback(async () => {
    try {
      setIsConnecting(true);
      const token = await getLinkToken();

      await plaidDestroy();

      plaidCreate({
        token,
        noLoadingState: false,
        onLoad: () => {
          plaidOpen({
            onSuccess: async (success: LinkSuccess) => {
              try {
                setIsConnecting(true);
                const institutionName = success.metadata?.institution?.name;
                await exchangePublicToken(success.publicToken, institutionName);
                Alert.alert(
                  "Success!",
                  `${institutionName || "Bank"} connected successfully.`,
                );
                router.dismissAll();
              } catch (err) {
                console.error("Error exchanging token:", err);
                Alert.alert(
                  "Connection Error",
                  "Bank connection failed. Please try again.",
                );
              } finally {
                setIsConnecting(false);
              }
            },
            onExit: (exit: LinkExit) => {
              console.log("Plaid Link exited:", exit);
              setIsConnecting(false);
            },
          });
        },
      });
    } catch (err) {
      console.error("Error getting link token:", err);
      Alert.alert(
        "Connection Error",
        "Could not start bank connection. Please try again.",
      );
      setIsConnecting(false);
    }
  }, [router]);

  useEffect(() => {
    navigation.setOptions({
      title: "Add Account",
      headerBackVisible: false,
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : pageBackground,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => ({
            minWidth: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <IconSymbol name="xmark" size={22} color={ui.text} />
        </Pressable>
      ),
    });
  }, [navigation, pageBackground, router, ui.accent, ui.text]);

  return (
    <SelectionModal
      visible
      isSheet
      hideHeader
      onClose={() => router.back()}
      title="Add Account"
      ui={{ ...ui, surface: pageBackground }}
    >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: optionBackground,
            borderColor: subtleBorder,
          },
        ]}
      >
        <View
          style={[
            styles.heroBadge,
            { backgroundColor: heroBadgeBackground },
          ]}
        >
          <IconSymbol name="wallet.bifold" size={18} color={ui.accent} />
        </View>
        <ThemedText style={[styles.heroTitle, { color: ui.text }]}>
          Choose how you want to add this account
        </ThemedText>
        <ThemedText style={[styles.heroSubtitle, { color: ui.mutedText }]}>
          Start with a self-managed account or connect your bank for automatic sync.
        </ThemedText>
      </View>

      <Pressable
        style={[
          styles.optionCard,
          {
            borderColor: subtleBorder,
            backgroundColor: optionBackground,
          },
        ]}
        onPress={() => router.push("/add-account-source/manual")}
      >
        <View
          style={[
            styles.optionIconWrap,
            { backgroundColor: iconChipBackground },
          ]}
        >
          <Feather name="edit-2" size={18} color={ui.text} />
        </View>
        <View style={styles.optionBody}>
          <View style={styles.optionHeaderRow}>
            <ThemedText type="defaultSemiBold">Self-Managed Account</ThemedText>
            <Feather name="chevron-right" size={18} color={ui.mutedText} />
          </View>
          <ThemedText style={{ color: ui.mutedText, fontSize: 13, marginTop: 4 }}>
            Add the balance and details yourself, then track transactions manually.
          </ThemedText>
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.optionCard,
          {
            borderColor: subtleBorder,
            backgroundColor: connectCardBackground,
            opacity: isConnecting ? 0.8 : 1,
          },
        ]}
        disabled={isConnecting}
        onPress={handleConnectBank}
      >
        <View
          style={[
            styles.optionIconWrap,
            { backgroundColor: ui.accentSoft },
          ]}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color={ui.accent} />
          ) : (
            <Feather name="link" size={18} color={ui.accent} />
          )}
        </View>
        <View style={styles.optionBody}>
          <View style={styles.optionHeaderRow}>
            <ThemedText type="defaultSemiBold">
              {isConnecting ? "Connecting..." : "Connect Bank"}
            </ThemedText>
            <Feather name="chevron-right" size={18} color={ui.mutedText} />
          </View>
          <ThemedText style={{ color: ui.mutedText, fontSize: 13, marginTop: 4 }}>
            Sync balances and transactions automatically with Plaid.
          </ThemedText>
        </View>
      </Pressable>

      <View style={styles.footnoteWrap}>
        <ThemedText style={[styles.footnote, { color: ui.mutedText }]}>
          You can unlink bank connections or edit manual accounts later from the account details screen.
        </ThemedText>
      </View>
    </SelectionModal>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
    marginBottom: 6,
  },
  heroBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 26,
    textAlign: "center",
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  optionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBody: {
    flex: 1,
  },
  optionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  footnoteWrap: {
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
