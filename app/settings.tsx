import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useThemeUI } from "@/hooks/use-theme-ui";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ui = useThemeUI();

  const settingsOptions = [
    {
      title: "GENERAL",
      items: [
        {
          icon: "user",
          label: "Account Management",
          value: "",
          onPress: () => {
            // Placeholder until the account management screen exists.
          },
        },
        {
          icon: "lock",
          label: "Change Password",
          value: "",
          onPress: () => {
            router.push("/change-password");
          },
        },
        {
          icon: "bell",
          label: "Notification Settings",
          value: "",
          onPress: () => {
            router.push("/notification-settings");
          },
        },
      ],
    },
    {
      title: "DISPLAY",
      items: [
        {
          icon: "moon",
          label: "Appearance",
          value: "System",
          onPress: () => {
            // Action placeholder
          },
        },
      ],
    },
    {
      title: "ABOUT",
      items: [
        {
          icon: "info",
          label: "Version",
          value: "1.0.0-alpha",
          onPress: () => {
            // Action placeholder
          },
        },
        {
          icon: "heart",
          label: "Rate Sterling Money",
          value: "",
          onPress: () => {
            // Action placeholder
          },
        },
        {
          icon: "mail",
          label: "Contact Support",
          value: "",
          onPress: () => {
            // Action placeholder
          },
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: ui.bg }]}>
      <Stack.Screen
        options={{
          title: "App Settings",
          headerBackTitle: "Profile",
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerStyle: Platform.OS === "android" ? {
            backgroundColor: ui.surface,
          } : undefined,
          headerTintColor: ui.text,
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === "ios" ? insets.top + 64 : 32 },
        ]}
      >
        {settingsOptions.map((section, sectionIdx) => (
          <View key={section.title} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: ui.mutedText }]}>
              {section.title}
            </ThemedText>

            <View
              style={[
                styles.card,
                { backgroundColor: ui.surface, borderColor: ui.border },
              ]}
            >
              {section.items.map((item, itemIdx) => (
                <React.Fragment key={item.label}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { backgroundColor: ui.surface2 },
                    ]}
                    onPress={item.onPress}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: ui.surface2 }]}>
                        <Feather name={item.icon as any} size={18} color={ui.text} />
                      </View>
                      <ThemedText type="defaultSemiBold">{item.label}</ThemedText>
                    </View>
                    <View style={styles.rowRight}>
                      {item.value ? (
                        <ThemedText style={{ color: ui.mutedText, fontSize: 14 }}>
                          {item.value}
                        </ThemedText>
                      ) : null}
                      <Feather name="chevron-right" size={20} color={ui.mutedText} />
                    </View>
                  </Pressable>
                  {itemIdx < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: ui.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginLeft: 12,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
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
    marginLeft: 60,
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
  },
});
