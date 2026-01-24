import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { useAuthContext } from "@/hooks/use-auth-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, session } = useAuthContext();

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
    [firstName, lastName].filter(Boolean).join(" ") ||
    fallbackFullName ||
    session?.user?.email ||
    "there";
  const currecy_pref =
    (profile?.currency_preference as string | undefined)?.trim() || "CAD";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Profile",
          headerBackTitle: "Back",
        }}
      />
      <ThemedView
        style={[
          styles.container,
          {
            paddingTop: 16 + insets.top,
          },
        ]}
      >
        <ThemedText type="title">{fullName}</ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">Email</ThemedText>
          <ThemedText>{session?.user?.email ?? "—"}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">Currency</ThemedText>
          <ThemedText>{currecy_pref ?? "—"}</ThemedText>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
});
