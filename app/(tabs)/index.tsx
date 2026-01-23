import React from "react";
import { StyleSheet } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import SignOutButton from "@/components/auth_buttons/sign-out-button";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function HomeScreen() {
  const { profile, session } = useAuthContext();
  const insets = useSafeAreaInsets();

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

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: 16 + insets.top,
        },
      ]}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome, {firstName || fullName} </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="default"> Full name: {fullName}</ThemedText>
        <ThemedText type="default"> Email: {session?.user?.email}</ThemedText>
        <ThemedText type="default">
          {" "}
          Preferred currency: {profile?.currency_preference}
        </ThemedText>
      </ThemedView>
      <SignOutButton />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
