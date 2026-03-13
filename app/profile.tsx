import Feather from "@expo/vector-icons/Feather";
import { Stack } from "expo-router";
import React, { useMemo } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";

import { onSignOutButtonPress } from "@/components/auth_buttons/sign-out-button";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useTheme } from "react-native-paper";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { profile, session } = useAuthContext();

  const theme = useTheme();
  const isAndroid = Platform.OS === 'android';

  const ui = useMemo(
    () => ({
      surface: isAndroid ? theme.colors.surface : (isDark ? "#121212" : "#ffffff"),
      surface2: isAndroid ? theme.colors.elevation.level2 : (isDark ? "#1e1e1e" : "#f5f5f5"),
      border: isAndroid ? theme.colors.outlineVariant : (isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"),
      text: isAndroid ? theme.colors.onSurface : (isDark ? "#ffffff" : "#111111"),
      mutedText: isAndroid ? theme.colors.onSurfaceVariant : (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"),
      accent: isAndroid ? theme.colors.primary : (isDark ? "#8CF2D1" : "#1F6F5B"),
      destructive: isAndroid ? theme.colors.error : "#FF3B30",
    }),
    [isDark, isAndroid, theme]
  );

  const userMetadata = session?.user?.user_metadata as
    | Record<string, any>
    | undefined;

  const fallbackFullName =
    (userMetadata?.full_name as string | undefined)?.trim() ||
    (userMetadata?.name as string | undefined)?.trim() ||
    undefined;

  const fallbackGiven =
    (userMetadata?.given_name as string | undefined)?.trim() || undefined;
  const fallbackFamily =
    (userMetadata?.family_name as string | undefined)?.trim() || undefined;

  const firstName =
    (profile?.first_name as string | undefined)?.trim() || fallbackGiven;
  const lastName =
    (profile?.last_name as string | undefined)?.trim() || fallbackFamily;
  const fullName =
    [firstName, lastName]
      .filter(Boolean)
      .map((name) => capitalizeFirstLetter(name as string))
      .join(" ") ||
    fallbackFullName ||
    session?.user?.email ||
    "there";

  const currecy_pref =
    (profile?.currency_preference as string | undefined)?.trim() || "CAD";

  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => (n as string).charAt(0).toUpperCase())
    .join("") || fullName.charAt(0).toUpperCase();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Profile",
          headerBackTitle: "Back",
          headerLargeTitle: true,
          headerTransparent: Platform.OS === "ios",
          headerStyle: {
            backgroundColor: ui.surface,
          },
          headerTintColor: ui.text,
          headerTitleStyle: {
            color: ui.text,
          },
          headerRight: () => (
            <Pressable
              onPress={() => Alert.alert("Settings", "Settings coming soon!")}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Feather name="settings" size={24} color={ui.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: ui.accent, borderColor: ui.border, borderWidth: 0 }]}>
            <ThemedText style={[styles.avatarText, { color: isAndroid ? theme.colors.onPrimary : ui.surface }]}>{initials}</ThemedText>
          </View>
          <ThemedText type="title" style={{ marginTop: 16, fontWeight: "700" }}>{fullName}</ThemedText>
          <ThemedText style={{ color: ui.mutedText, fontSize: 16, marginTop: 4 }}>
            {session?.user?.email ?? "—"}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: ui.mutedText }]}>PREFERENCES</ThemedText>

          <View style={[styles.card, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: ui.surface }]}>
                  <Feather name="dollar-sign" size={18} color={ui.text} />
                </View>
                <ThemedText type="defaultSemiBold">Currency</ThemedText>
              </View>
              <View style={styles.rowRight}>
                <ThemedText style={{ color: ui.mutedText }}>{currecy_pref}</ThemedText>
                <Feather name="chevron-right" size={20} color={ui.mutedText} />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: ui.border }]} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: ui.surface }]}>
                  <Feather name="bell" size={18} color={ui.text} />
                </View>
                <ThemedText type="defaultSemiBold">Notifications</ThemedText>
              </View>
              <View style={styles.rowRight}>
                <ThemedText style={{ color: ui.mutedText }}>On</ThemedText>
                <Feather name="chevron-right" size={20} color={ui.mutedText} />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { marginTop: 32 }]}>
          <Pressable
            onPress={onSignOutButtonPress}
            style={({ pressed }) => [
              styles.deleteAction,
              { borderColor: ui.border, backgroundColor: ui.surface2 },
              pressed && { opacity: 0.7 }
            ]}
          >
            <ThemedText style={{ color: ui.destructive, fontSize: 16, fontWeight: "600" }}>
              Sign Out
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

function capitalizeFirstLetter(str: string): string {
  if (!str) {
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    gap: 32,
  },
  avatarSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginLeft: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60, // Align with text
  },
  deleteAction: {
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
