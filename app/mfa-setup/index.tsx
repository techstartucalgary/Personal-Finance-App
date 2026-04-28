import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { useMFAEnroll } from "./_layout";

export default function MFAEnrollIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const ui = useThemeUI();
  const { loading, error, qrSvg, secret } = useMFAEnroll();

  const handleClose = useCallback(() => {
    router.dismiss();
  }, [router]);

  const handleCopySecret = useCallback(async () => {
    try {
      await Share.share({ message: secret });
    } catch {
      // User cancelled
    }
  }, [secret]);

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              onPress={handleClose}
              hitSlop={15}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <IconSymbol name="xmark" size={22} color={ui.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: Platform.OS === "ios" ? ui.surface2 : ui.bg }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === "ios" ? headerHeight + 8 : 24,
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ui.accent} />
            <ThemedText style={[styles.loadingText, { color: ui.mutedText }]}>
              Setting up authenticator…
            </ThemedText>
          </View>
        )}

        {error ? (
          <View style={styles.centered}>
            <Feather name="alert-circle" size={48} color={ui.destructive} />
            <ThemedText style={[styles.errorHeading, { color: ui.destructive }]}>
              Setup Failed
            </ThemedText>
            <ThemedText style={[styles.errorBody, { color: ui.mutedText }]} selectable>
              {error}
            </ThemedText>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.retryBtn,
                { borderColor: ui.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={{ color: ui.accent }}>Go Back</ThemedText>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && (
          <View style={styles.stepContainer}>
            <View style={styles.instructionBlock}>
              <View style={[styles.stepBadge, { backgroundColor: ui.accentSoft }]}>
                <ThemedText style={[styles.stepBadgeText, { color: ui.accent }]}>
                  Step 1 of 2
                </ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.stepTitle}>
                Scan QR Code
              </ThemedText>
              <ThemedText style={[styles.stepDesc, { color: ui.mutedText }]}>
                Open your authenticator app (Google Authenticator, Authy, or
                1Password) and scan the QR code below.
              </ThemedText>
            </View>

            <View style={[styles.qrCard, { backgroundColor: "#FFFFFF", borderColor: ui.border }]}>
              {qrSvg ? (() => {
                let cleanSvg = qrSvg.replace(/^data:image\/svg\+xml;utf-8,/, "");
                const viewBoxMatch = cleanSvg.match(/viewBox="([^"]*)"/);
                const widthMatch = cleanSvg.match(/width="(\d+)"/);
                const heightMatch = cleanSvg.match(/height="(\d+)"/);
                const vb = viewBoxMatch?.[1]
                  ?? `0 0 ${widthMatch?.[1] ?? "256"} ${heightMatch?.[1] ?? "256"}`;
                cleanSvg = cleanSvg.replace(/width="[^"]*"/, "").replace(/height="[^"]*"/, "");
                if (!viewBoxMatch) cleanSvg = cleanSvg.replace(/<svg/, `<svg viewBox="${vb}"`);
                return (
                  <View style={styles.qrContainer}>
                    <SvgXml xml={cleanSvg} width={200} height={200} />
                  </View>
                );
              })() : null}
            </View>

            <View style={styles.secretBlock}>
              <ThemedText style={[styles.secretLabel, { color: ui.mutedText }]}>
                Can't scan? Enter this key manually:
              </ThemedText>
              <Pressable
                onPress={handleCopySecret}
                style={({ pressed }) => [
                  styles.secretRow,
                  { backgroundColor: ui.surface, borderColor: ui.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <ThemedText style={[styles.secretText, { color: ui.text }]} selectable numberOfLines={1}>
                  {secret}
                </ThemedText>
                <Feather name="copy" size={18} color={ui.mutedText} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.push("/mfa-setup/verify")}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: ui.accent },
                pressed && { opacity: 0.85 },
              ]}
            >
              <ThemedText style={[styles.primaryBtnText, { color: ui.primaryText }]}>
                I've Scanned the Code
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  centered: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16 },
  loadingText: { fontSize: 16, marginTop: 8 },
  errorHeading: { fontSize: 20, fontWeight: "700" },
  errorBody: { fontSize: 15, textAlign: "center", paddingHorizontal: 20 },
  retryBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  stepContainer: { gap: 24 },
  instructionBlock: { gap: 8 },
  stepBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  stepBadgeText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  stepTitle: { fontWeight: "700", marginTop: 4 },
  stepDesc: { fontSize: 15, lineHeight: 22 },
  qrCard: { alignSelf: "center", padding: 24, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  qrContainer: { width: 220, height: 220, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 12 },
  secretBlock: { gap: 8 },
  secretLabel: { fontSize: 14 },
  secretRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderCurve: "continuous", gap: 12 },
  secretText: { fontSize: 14, fontWeight: "600", letterSpacing: 1.5, flex: 1, fontVariant: ["tabular-nums"] },
  primaryBtn: { height: 52, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 17, fontWeight: "700" },
});
