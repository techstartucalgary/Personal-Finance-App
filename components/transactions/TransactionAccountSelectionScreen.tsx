import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AccountRow } from "@/components/AddTransactionModal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { listAccounts } from "@/utils/accounts";

type Ui = ReturnType<typeof useThemeUI>;

type Props = {
  currentAccountId?: number | null;
  onSelectAccount: (account: AccountRow) => void;
  uiOverride?: Ui;
};

function buildAccountUi(ui: Ui, uiOverride?: Ui) {
  return uiOverride ?? ui;
}

export function TransactionAccountSelectionScreen({
  currentAccountId = null,
  onSelectAccount,
  uiOverride,
}: Props) {
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const themeUi = useThemeUI();
  const ui = buildAccountUi(themeUi, uiOverride);
  const userId = session?.user.id;
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E" || ui.bg === "#1B1B1E";
  const pageBackground = ui.bg;
  const listBackground = ui.surface;

  useEffect(() => {
    const loadAccounts = async () => {
      if (!userId) {
        setAccounts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const rows = await listAccounts({ profile_id: userId });
        setAccounts(((rows as AccountRow[]) ?? []).slice().sort((a, b) => {
          return (a.account_name ?? "").localeCompare(b.account_name ?? "");
        }));
      } catch (error) {
        console.error("Error loading accounts for selection:", error);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, [userId]);

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Loading accounts...";
    return "No accounts yet.";
  }, [isLoading]);

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
            SELECT ACCOUNT
          </ThemedText>
        </View>

        <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: listBackground }]}>
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
              const isSelected = currentAccountId === account.id;
              const iconName = account.account_type === "credit" ? "creditcard" : "banknote";
              const subtitle = account.account_type === "credit" ? "Credit account" : "Debit account";

              return (
                <React.Fragment key={account.id}>
                  <Pressable
                    onPress={() => onSelectAccount(account)}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
                  >
                    <View style={styles.rowLeading}>
                      <View
                        style={[
                          styles.iconWrap,
                          {
                            backgroundColor: isSelected
                              ? ui.accentSoft
                              : isDark
                                ? ui.surface2
                                : "#F2F2F7",
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
                          {account.account_name ?? "Unnamed account"}
                        </ThemedText>
                        <ThemedText style={[styles.subtitle, { color: ui.mutedText }]}>
                          {subtitle}
                        </ThemedText>
                      </View>
                    </View>

                    {isSelected ? (
                      <IconSymbol name="checkmark" size={18} color={ui.accent} />
                    ) : null}
                  </Pressable>

                  {index < accounts.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: ui.border }]} />
                  )}
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
  emptyState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
});
