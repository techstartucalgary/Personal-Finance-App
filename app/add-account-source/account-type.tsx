import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { setPendingAddAccountType } from "@/components/accounts/add-account-type-selection";
import type { AccountType } from "@/components/accounts/tab/types";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeUI } from "@/hooks/use-theme-ui";

const ACCOUNT_TYPE_OPTIONS: Array<{
  value: AccountType;
  title: string;
  subtitle: string;
  icon: "creditcard" | "banknote";
}> = [
  {
    value: "credit",
    title: "Credit",
    subtitle: "For credit cards and revolving balances.",
    icon: "creditcard",
  },
  {
    value: "debit",
    title: "Debit",
    subtitle: "For checking, savings, and cash-style accounts.",
    icon: "banknote",
  },
];

export default function AddAccountTypeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const ui = useThemeUI();
  const { currentType } = useLocalSearchParams<{ currentType?: AccountType }>();
  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E";
  const pageBackground = isDark ? ui.surface : "#F2F2F7";
  const listBackground = isDark ? ui.surface2 : "#FFFFFF";
  const selectedType = currentType === "debit" ? "debit" : "credit";

  useEffect(() => {
    navigation.setOptions({
      title: "Account Type",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : pageBackground,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
    });
  }, [navigation, pageBackground, ui.accent, ui.text]);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: pageBackground }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>
            CHOOSE ACCOUNT TYPE
          </ThemedText>
        </View>

        <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: listBackground }]}>
          {ACCOUNT_TYPE_OPTIONS.map((option, index) => {
            const isSelected = option.value === selectedType;

            return (
              <React.Fragment key={option.value}>
                <Pressable
                  onPress={() => {
                    setPendingAddAccountType(option.value);
                    router.back();
                  }}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
                >
                  <View style={styles.rowLeading}>
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: isSelected ? ui.accentSoft : pageBackground,
                        },
                      ]}
                    >
                      <IconSymbol
                        name={option.icon}
                        size={18}
                        color={isSelected ? ui.accent : ui.mutedText}
                      />
                    </View>
                    <View style={styles.copyWrap}>
                      <ThemedText style={[styles.title, { color: ui.text }]}>
                        {option.title}
                      </ThemedText>
                      <ThemedText style={[styles.subtitle, { color: ui.mutedText }]}>
                        {option.subtitle}
                      </ThemedText>
                    </View>
                  </View>

                  {isSelected ? (
                    <IconSymbol name="checkmark" size={18} color={ui.accent} />
                  ) : null}
                </Pressable>

                {index < ACCOUNT_TYPE_OPTIONS.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: ui.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { marginTop: 6 },
  sectionHeaderText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  groupCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  row: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copyWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
});
