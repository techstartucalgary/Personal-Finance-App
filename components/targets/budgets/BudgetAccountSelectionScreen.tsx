import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Tokens } from "@/constants/authTokens";
import { tabsTheme } from "@/constants/tabsTheme";
import { listAccounts } from "@/utils/accounts";
import { getPlaidAccounts } from "@/utils/plaid";

import type { BudgetSelectableAccount } from "./types";

import { buildSelectableAccounts, getGoalSelectionKey } from "../goals/utils";

type BudgetAccountSelectionScreenProps = {
  currentAccountKey?: string | null;
  userId?: string;
  onSelectAccount: (account: BudgetSelectableAccount) => void;
  onClearSelection: () => void;
};

const AVATAR_COLORS = ["#DE7C78", "#67C7C0", "#D96CB9", "#6F8BEA", "#F2B35D"];

export function BudgetAccountSelectionScreen({
  currentAccountKey = null,
  userId,
  onSelectAccount,
  onClearSelection,
}: BudgetAccountSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const ui = tabsTheme.ui;
  const [accounts, setAccounts] = useState<BudgetSelectableAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    navigation.setOptions({
      title: "Link Account",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: {
        color: ui.text,
        fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
      },
      headerTintColor: ui.text,
      headerRight: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <Feather name="x" size={20} color={ui.text} />
        </Pressable>
      ),
    });
  }, [navigation, router, ui.bg, ui.text]);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!userId) {
        setAccounts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [manualAccounts, plaidAccounts] = await Promise.all([
          listAccounts({ profile_id: userId }),
          getPlaidAccounts(),
        ]);

        setAccounts(
          buildSelectableAccounts({
            manualAccounts: (manualAccounts as any[]) ?? [],
            plaidAccounts,
          }),
        );
      } catch (error) {
        console.error("Error loading budget accounts:", error);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, [userId]);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const lowered = searchQuery.toLowerCase();
    return accounts.filter((account) => {
      const subtitle = account.isPlaid
        ? account.institutionName ?? "Plaid account"
        : account.type ?? "Manual account";
      return (
        account.name.toLowerCase().includes(lowered) ||
        subtitle.toLowerCase().includes(lowered)
      );
    });
  }, [accounts, searchQuery]);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "android" ? 16 : 0,
          paddingBottom: insets.bottom + 28,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.linkIconWrap}>
          <View style={styles.linkIconCircle}>
            <Feather name="link-2" size={18} color="#FFFFFF" />
          </View>
        </View>

        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: ui.surface,
              borderColor: ui.border,
            },
          ]}
        >
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={ui.mutedText}
            style={[styles.searchInput, { color: ui.text }]}
          />
        </View>

        {currentAccountKey ? (
          <Pressable
            onPress={onClearSelection}
            style={({ pressed }) => [
              styles.clearButton,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <Feather name="slash" size={14} color={ui.text} />
            <ThemedText style={[styles.clearButtonText, { color: ui.text }]}>
              Clear Linked Account
            </ThemedText>
          </Pressable>
        ) : null}

        <View style={styles.listStack}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={ui.accent} />
            </View>
          ) : filteredAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={{ color: ui.mutedText }}>
                No accounts available yet.
              </ThemedText>
            </View>
          ) : (
            filteredAccounts.map((account, index) => {
              const selectionKey = getGoalSelectionKey(account);
              const isSelected = selectionKey === currentAccountKey;
              const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
              const subtitle = account.isPlaid
                ? account.institutionName ?? "Bank account"
                : account.type === "credit"
                  ? "Credit"
                  : account.type === "debit"
                    ? "Debit"
                    : "Account";

              return (
                <Pressable
                  key={selectionKey ?? String(account.id)}
                  onPress={() => onSelectAccount(account)}
                  style={({ pressed }) => [
                    styles.accountRow,
                    { opacity: pressed ? 0.72 : 1 },
                  ]}
                >
                  <View style={styles.accountLeading}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                      <ThemedText style={styles.avatarText}>
                        {getInitials(account.name)}
                      </ThemedText>
                    </View>

                    <View style={styles.accountCopy}>
                      <ThemedText style={[styles.accountTitle, { color: ui.text }]}>
                        {account.name}
                      </ThemedText>
                      <ThemedText style={[styles.accountSubtitle, { color: ui.mutedText }]}>
                        {subtitle}
                      </ThemedText>
                    </View>
                  </View>

                  <Feather
                    name={isSelected ? "check" : "slash"}
                    size={16}
                    color={ui.text}
                  />
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const styles = StyleSheet.create({
  linkIconWrap: {
    alignItems: "center",
    paddingTop: 2,
  },
  linkIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#57524D",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.16)",
  },
  searchWrap: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  searchInput: {
    fontSize: 14,
    paddingVertical: 10,
    fontFamily: Tokens.font.family,
  },
  clearButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  clearButtonText: {
    fontSize: 13,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  listStack: {
    gap: 12,
  },
  accountRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  accountLeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#1E1E1E",
    fontSize: 18,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  accountCopy: {
    flex: 1,
    gap: 2,
  },
  accountTitle: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  accountSubtitle: {
    fontSize: 12,
    fontFamily: Tokens.font.family,
  },
  emptyState: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
});
