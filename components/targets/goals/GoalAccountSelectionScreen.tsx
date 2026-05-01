import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTabsTheme } from "@/constants/tabsTheme";
import { listAccounts } from "@/utils/accounts";
import { getPlaidAccounts } from "@/utils/plaid";

import type { GoalSelectableAccount } from "./types";
import { buildSelectableAccounts, getGoalSelectionKey } from "./utils";

type GoalAccountSelectionScreenProps = {
  currentAccountKey?: string | null;
  userId?: string;
  onSelectAccount: (account: GoalSelectableAccount) => void;
};

export function GoalAccountSelectionScreen({
  currentAccountKey = null,
  userId,
  onSelectAccount,
}: GoalAccountSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { ui } = useTabsTheme();
  const [accounts, setAccounts] = useState<GoalSelectableAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        console.error("Error loading goal accounts:", error);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, [userId]);

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Loading accounts...";
    return "No accounts available yet.";
  }, [isLoading]);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "android" ? 12 : 0,
          paddingBottom: insets.bottom + 24,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>
            SELECT ACCOUNT
          </ThemedText>
        </View>

        <View
          style={[
            styles.groupCard,
            { borderColor: ui.border, backgroundColor: ui.surface },
          ]}
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={ui.accent} />
            </View>
          ) : accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={{ color: ui.mutedText }}>{emptyMessage}</ThemedText>
            </View>
          ) : (
            accounts.map((account, index) => {
              const isSelected =
                getGoalSelectionKey(account) === currentAccountKey;
              const iconName = account.isPlaid
                ? "building.columns"
                : account.type === "credit"
                  ? "creditcard"
                  : "banknote";
              const subtitleBits = [
                account.isPlaid
                  ? account.institutionName ?? "Plaid account"
                  : account.type === "credit"
                    ? "Credit account"
                    : "Manual account",
                account.mask ? `••${account.mask}` : null,
              ].filter(Boolean);

              return (
                <React.Fragment key={getGoalSelectionKey(account) ?? String(account.id)}>
                  <Pressable
                    onPress={() => onSelectAccount(account)}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
                  >
                    <View style={styles.rowLeading}>
                      <View
                        style={[
                          styles.iconWrap,
                          {
                            backgroundColor: isSelected ? ui.accentSoft : ui.surface2,
                          },
                        ]}
                      >
                        <IconSymbol
                          name={iconName}
                          size={18}
                          color={isSelected ? ui.accent : ui.mutedText}
                        />
                      </View>
                      <View style={styles.copyWrap}>
                        <ThemedText style={[styles.title, { color: ui.text }]}>
                          {account.name}
                        </ThemedText>
                        <ThemedText style={[styles.subtitle, { color: ui.mutedText }]}>
                          {subtitleBits.join(" • ")}
                        </ThemedText>
                      </View>
                    </View>

                    {isSelected ? (
                      <IconSymbol name="checkmark" size={18} color={ui.accent} />
                    ) : null}
                  </Pressable>

                  {index < accounts.length - 1 ? (
                    <View style={[styles.separator, { backgroundColor: ui.border }]} />
                  ) : null}
                </React.Fragment>
              );
            })
          )}
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
    minHeight: 72,
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
    width: 40,
    height: 40,
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
    marginLeft: 68,
  },
  emptyState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
});
