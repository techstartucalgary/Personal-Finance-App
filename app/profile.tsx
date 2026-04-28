import { IconSymbol } from "@/components/ui/icon-symbol";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";

import { onSignOutButtonPress } from "@/components/auth_buttons/sign-out-button";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { supabase } from "@/utils/supabase";
import { useTheme } from "react-native-paper";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, session } = useAuthContext();
  const router = useRouter();
  const params = useLocalSearchParams<{
    verifiedAction?: string;
    verifiedFactorId?: string;
    verifiedFactorName?: string;
  }>();

  const theme = useTheme();
  const isAndroid = Platform.OS === 'android';

  const ui = useThemeUI();

  // MFA status
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<
    { id: string; friendly_name: string; factor_type: string; status: string; created_at: string }[]
  >([]);
  const handledVerifiedActionRef = useRef<string | null>(null);

  const checkMfaStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data) return;
      // data.totp and data.phone only contain verified factors
      const verified = [...(data.totp ?? []), ...(data.phone ?? [])];
      setMfaFactors(verified);
      setMfaEnabled(verified.length > 0);
    } catch { }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkMfaStatus();
    }, [checkMfaStatus])
  );

  useEffect(() => {
    const verifiedAction = typeof params.verifiedAction === "string" ? params.verifiedAction : "";
    const verifiedFactorId = typeof params.verifiedFactorId === "string" ? params.verifiedFactorId : "";
    const verifiedFactorName = typeof params.verifiedFactorName === "string" ? params.verifiedFactorName : "device";

    if (!verifiedAction) {
      handledVerifiedActionRef.current = null;
      return;
    }

    const actionKey = `${verifiedAction}:${verifiedFactorId}:${verifiedFactorName}`;
    if (handledVerifiedActionRef.current === actionKey) return;
    handledVerifiedActionRef.current = actionKey;

    const clearVerifiedAction = () => {
      router.replace("/profile");
    };

    if (verifiedAction === "add-factor") {
      clearVerifiedAction();
      router.push("/mfa-setup" as any);
      return;
    }

    if (verifiedAction !== "remove-factor" || !verifiedFactorId) {
      clearVerifiedAction();
      return;
    }

    (async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
      if (error) {
        Alert.alert("Error", error.message, [{ text: "OK", onPress: clearVerifiedAction }]);
        return;
      }

      await supabase.auth.refreshSession();
      await checkMfaStatus();

      Alert.alert(
        "Device Removed",
        `"${verifiedFactorName}" has been removed from two-factor authentication.`,
        [{ text: "OK", onPress: clearVerifiedAction }]
      );
    })().catch((error: any) => {
      Alert.alert("Error", error?.message ?? "Could not remove this MFA device.", [
        { text: "OK", onPress: clearVerifiedAction },
      ]);
    });
  }, [checkMfaStatus, params.verifiedAction, params.verifiedFactorId, params.verifiedFactorName, router]);

  const handleUnenroll = useCallback(
    (factorId: string, name: string) => {
      Alert.alert(
        "Remove Device",
        `Are you sure you want to remove "${name}"? We'll ask for a verification code before removing it.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            style: "destructive",
            onPress: () => {
              router.push({
                pathname: "/mfa-verify",
                params: {
                  intent: "remove-factor",
                  returnTo: "/profile",
                  verifiedFactorId: factorId,
                  verifiedFactorName: name,
                },
              } as any);
            },
          },
        ]
      );
    },
    [router]
  );

  const handleAddFactor = useCallback(() => {
    if (!mfaEnabled) {
      router.push("/mfa-setup" as any);
      return;
    }

    router.push({
      pathname: "/mfa-verify",
      params: {
        intent: "add-factor",
        returnTo: "/profile",
      },
    } as any);
  }, [mfaEnabled, router]);

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
          headerBackTitle: "Dashboard",
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerLargeTitle: false,
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerStyle: Platform.OS === "android" ? {
            backgroundColor: ui.surface,
          } : undefined,
          headerTintColor: ui.text,
          headerTitleStyle: {
            color: ui.text,
          },
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 0,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Feather name="settings" size={24} color={ui.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: ui.bg }]}
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

          <View style={[styles.card, { backgroundColor: ui.surface, borderColor: ui.border }]}>
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

            <Pressable
              onPress={() => router.push("/notification-settings")}
              style={({ pressed }) => [
                styles.row,
                pressed && { opacity: 0.7 },
              ]}
            >
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
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: ui.mutedText }]}>SECURITY</ThemedText>

          <View style={[styles.card, { backgroundColor: ui.surface, borderColor: ui.border }]}>
            {/* Header row — always visible */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: ui.surface }]}>
                  <Feather name="shield" size={18} color={ui.accent} />
                </View>
                <View style={{ gap: 2 }}>
                  <ThemedText type="defaultSemiBold">Two-Factor Authentication</ThemedText>
                  <ThemedText style={{ color: mfaEnabled ? ui.positive : ui.mutedText, fontSize: 13 }}>
                    {mfaEnabled ? `${mfaFactors.length} device${mfaFactors.length !== 1 ? "s" : ""} enrolled` : "Not enabled"}
                  </ThemedText>
                </View>
              </View>
              {!mfaEnabled && (
                <Pressable
                  onPress={handleAddFactor}
                  hitSlop={10}
                  style={({ pressed }) => [
                    {
                      backgroundColor: ui.accent,
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 10,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <ThemedText style={{ color: ui.primaryText, fontSize: 14, fontWeight: "600" }}>
                    Enable
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* Factor list — only when MFA is active */}
            {mfaEnabled && mfaFactors.map((factor, idx) => (
              <React.Fragment key={factor.id}>
                <View style={[styles.divider, { backgroundColor: ui.border }]} />
                <View style={[styles.row, { paddingVertical: 14 }]}>
                  <View style={[styles.rowLeft, { flex: 1 }]}>
                    <View style={[styles.iconBox, { backgroundColor: ui.surface }]}>
                      <Feather
                        name={factor.factor_type === "totp" ? "smartphone" : "phone"}
                        size={16}
                        color={ui.mutedText}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {factor.friendly_name || `Authenticator ${idx + 1}`}
                      </ThemedText>
                      <ThemedText style={{ color: ui.mutedText, fontSize: 12 }}>
                        {factor.factor_type.toUpperCase()} · Added{" "}
                        {new Date(factor.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleUnenroll(factor.id, factor.friendly_name || `Authenticator ${idx + 1}`)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      {
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: ui.destructiveSoft,
                      },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <IconSymbol name="trash" size={18} color={ui.destructive} />
                  </Pressable>
                </View>
              </React.Fragment>
            ))}

            {/* Add new factor button — when MFA is already enabled */}
            {mfaEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: ui.border }]} />
                <Pressable
                  onPress={handleAddFactor}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: ui.surface }]}>
                      <Feather name="plus" size={18} color={ui.accent} />
                    </View>
                    <ThemedText style={{ color: ui.accent, fontWeight: "600" }}>
                      Add New Device
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={ui.mutedText} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={[styles.section, { marginTop: 32 }]}>
          <Pressable
            onPress={onSignOutButtonPress}
            style={({ pressed }) => [
              styles.deleteAction,
              { borderColor: ui.border, backgroundColor: ui.surface },
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
    borderRadius: 24,
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
