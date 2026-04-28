import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";

import type { ExpenseRow } from "@/components/transactions/tab/types";
import { ThemedText } from "@/components/themed-text";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { Tokens } from "@/constants/authTokens";
import { tabsTheme } from "@/constants/tabsTheme";
import { useAuthContext } from "@/hooks/use-auth-context";
import { createBudget, deleteBudget, editBudget, getBudget } from "@/utils/budgets";
import {
  createCategoryBudget,
  deleteCategoryBudget,
  listCategoryBudgets,
  type BudgetPeriod,
} from "@/utils/categoryBudgets";
import { listCategories, type CategoryRow } from "@/utils/categories";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { listExpenses } from "@/utils/expenses";
import { listAccounts } from "@/utils/accounts";
import { getPlaidAccounts } from "@/utils/plaid";

import {
  consumePendingBudgetAccountSelection,
} from "./pending-budget-account-selection";
import {
  getBudgetUiPreference,
  removeBudgetUiPreference,
  saveBudgetUiPreference,
} from "./storage";
import type {
  BudgetDraftCategory,
  BudgetRow,
  BudgetSelectableAccount,
  BudgetWithDetails,
} from "./types";
import {
  buildBudgetWithDetails,
  formatBudgetPeriodLabel,
  formatLongDate,
  formatMoney,
  getBudgetEndDate,
} from "./utils";

import { buildSelectableAccounts, getGoalSelectionKey } from "../goals/utils";

type BudgetEditorScreenProps = {
  mode: "add" | "edit";
};

const PERIOD_OPTIONS: BudgetPeriod[] = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
];

const AVATAR_COLORS = ["#DE7C78", "#67C7C0", "#D96CB9", "#6F8BEA", "#F2B35D"];

export function BudgetEditorScreen({ mode }: BudgetEditorScreenProps) {
  const { session } = useAuthContext();
  const navigation = useNavigation();
  const router = useRouter();
  const ui = tabsTheme.ui;
  const userId = session?.user.id;
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<string | null>(toLocalISOString(new Date()));
  const [recurrence, setRecurrence] = useState<BudgetPeriod>("monthly");
  const [rolloverEnabled, setRolloverEnabled] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [drafts, setDrafts] = useState<BudgetDraftCategory[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BudgetSelectableAccount | null>(null);
  const [spentByCategory, setSpentByCategory] = useState<Record<number, number>>({});
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);

  const hydrateFromBudget = useCallback(
    (budget: BudgetWithDetails, selectableAccounts: BudgetSelectableAccount[]) => {
      setName(budget.budget_name ?? "");
      setStartDate(budget.start_date ?? toLocalISOString(new Date()));
      setRecurrence(budget.recurrence);
      setRolloverEnabled(budget.rolloverEnabled);
      setDrafts(
        budget.categoryBudgets.map((category) => ({
          localKey: String(category.id),
          expense_category_id: category.expense_category_id,
          category_name: category.category_name,
          limit_amount: String(category.limit_amount ?? ""),
        })),
      );
      setSpentByCategory(
        budget.categoryBudgets.reduce<Record<number, number>>((accumulator, category) => {
          accumulator[category.expense_category_id] = category.spent;
          return accumulator;
        }, {}),
      );
      setSelectedAccount(
        selectableAccounts.find(
          (account) => getGoalSelectionKey(account) === budget.linkedAccountKey,
        ) ?? null,
      );
    },
    [],
  );

  const loadBudget = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const [categoryRows, manualAccounts, plaidAccounts] = await Promise.all([
        listCategories({ profile_id: userId }),
        listAccounts({ profile_id: userId }),
        getPlaidAccounts(),
      ]);

      const selectableAccounts = buildSelectableAccounts({
        manualAccounts: (manualAccounts as any[]) ?? [],
        plaidAccounts,
      });

      setCategories(categoryRows ?? []);

      if (mode !== "edit" || !id) {
        setName("");
        setDrafts([]);
        setSpentByCategory({});
        return;
      }

      const [budgetRow, categoryLinks, expenses, preference] = await Promise.all([
        getBudget({ id, profile_id: userId }),
        listCategoryBudgets({ budget_id: Number(id) }),
        listExpenses({ profile_id: userId }),
        getBudgetUiPreference(id),
      ]);

      const budget = buildBudgetWithDetails({
        budget: budgetRow as BudgetRow,
        categoryBudgets: categoryLinks,
        categories: categoryRows ?? [],
        expenses: (expenses as ExpenseRow[]) ?? [],
        preference,
      });

      hydrateFromBudget(budget, selectableAccounts);
    } catch (error) {
      console.error("Error loading budget editor:", error);
      Alert.alert("Error", "Could not load budget details.");
      if (mode === "edit") router.back();
    } finally {
      setIsLoading(false);
    }
  }, [hydrateFromBudget, id, mode, router, userId]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  useFocusEffect(
    useCallback(() => {
      const pendingSelection = consumePendingBudgetAccountSelection();
      if (pendingSelection !== undefined) {
        setSelectedAccount(pendingSelection);
      }
    }, []),
  );

  const totalBudgeted = useMemo(
    () =>
      drafts.reduce((sum, draft) => {
        const parsed = Number(draft.limit_amount);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
    [drafts],
  );

  const canSave = useMemo(() => {
    return (
      name.trim().length > 0 &&
      !!startDate &&
      drafts.length > 0 &&
      drafts.every((draft) => Number(draft.limit_amount) > 0)
    );
  }, [drafts, name, startDate]);

  const handleAddCategory = useCallback(
    (category: CategoryRow) => {
      setDrafts((current) => {
        if (current.some((draft) => draft.expense_category_id === category.id)) {
          return current;
        }

        return [
          ...current,
          {
            localKey: `${category.id}-${Date.now()}`,
            expense_category_id: category.id,
            category_name: category.category_name ?? "Expense",
            limit_amount: "",
          },
        ];
      });
      setCategoryPickerOpen(false);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!userId || !canSave || !startDate) return;

    const parsedDrafts = drafts.map((draft) => ({
      ...draft,
      amount: Number(draft.limit_amount),
    }));
    const hasInvalidDraft = parsedDrafts.some(
      (draft) => !Number.isFinite(draft.amount) || draft.amount <= 0,
    );

    if (hasInvalidDraft) {
      Alert.alert("Invalid Budget", "Enter a valid amount for each expense line.");
      return;
    }

    try {
      const endDate = getBudgetEndDate(startDate, recurrence);
      const totalAmount = parsedDrafts.reduce((sum, draft) => sum + draft.amount, 0);
      let budgetId = Number(id);

      if (mode === "edit" && id) {
        const existingLinks = await listCategoryBudgets({ budget_id: Number(id) });
        await editBudget({
          id,
          profile_id: userId,
          update: {
            budget_name: name.trim(),
            total_amount: totalAmount,
            start_date: startDate,
            end_date: endDate,
          },
        });

        for (const link of existingLinks) {
          await deleteCategoryBudget({ id: link.id });
        }
      } else {
        const created = await createBudget({
          profile_id: userId,
          budget_name: name.trim(),
          total_amount: totalAmount,
          start_date: startDate,
          end_date: endDate,
        });
        budgetId = Number((created as any).id);
      }

      for (const draft of parsedDrafts) {
        await createCategoryBudget({
          budget_id: budgetId,
          expense_category_id: draft.expense_category_id,
          limit_amount: draft.amount,
          budget_period: recurrence,
        });
      }

      await saveBudgetUiPreference(budgetId, {
        linkedAccountKey: getGoalSelectionKey(selectedAccount),
        rolloverEnabled,
      });

      router.back();
    } catch (error) {
      console.error("Error saving budget:", error);
      Alert.alert("Error", "Could not save budget.");
    }
  }, [
    canSave,
    drafts,
    id,
    mode,
    name,
    recurrence,
    rolloverEnabled,
    router,
    selectedAccount,
    startDate,
    userId,
  ]);

  useEffect(() => {
    navigation.setOptions({
      title: "Budget Plan",
      headerBackVisible: false,
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
      headerLeft: () => (
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
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            opacity: !canSave ? 0.3 : pressed ? 0.55 : 1,
          })}
        >
          <Feather name="check" size={20} color={ui.text} />
        </Pressable>
      ),
    });
  }, [canSave, handleSave, navigation, router, ui.bg, ui.text]);

  const handleDelete = useCallback(() => {
    if (!userId || !id || mode !== "edit") return;

    Alert.alert("Delete Budget", "Are you sure you want to delete this budget?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const links = await listCategoryBudgets({ budget_id: Number(id) });
            for (const link of links) {
              await deleteCategoryBudget({ id: link.id });
            }
            await deleteBudget({ id, profile_id: userId });
            await removeBudgetUiPreference(id);
            router.replace("/(tabs)/targets" as any);
          } catch (error) {
            console.error("Error deleting budget:", error);
            Alert.alert("Error", "Could not delete budget.");
          }
        },
      },
    ]);
  }, [id, mode, router, userId]);

  if (isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={ui.accent} />
      </View>
    );
  }

  const availableCategories = categories.filter(
    (category) => !drafts.some((draft) => draft.expense_category_id === category.id),
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: ui.bg }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === "android" ? 16 : 0 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroPanel}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Budget Plan 1"
              placeholderTextColor={ui.text}
              style={[styles.heroNameInput, { color: ui.text }]}
            />

            <ThemedText style={[styles.heroAmount, { color: totalBudgeted > 0 ? "#F15A46" : ui.text }]}>
              {formatMoney(totalBudgeted)}
            </ThemedText>

            <Pressable
              onPress={() => {
                const pathname =
                  mode === "edit" && id
                    ? "/budget/[id]/account-select"
                    : "/budget-add/account-select";
                router.push({
                  pathname,
                  params: {
                    ...(mode === "edit" && id ? { id } : {}),
                    currentAccountKey: getGoalSelectionKey(selectedAccount) ?? undefined,
                  },
                } as any);
              }}
              style={({ pressed }) => [styles.linkAccountWrap, { opacity: pressed ? 0.72 : 1 }]}
            >
              <ThemedText style={[styles.linkAccountLabel, { color: ui.text }]}>
                Link Account
              </ThemedText>

              {selectedAccount ? (
                <View style={styles.badgeRow}>
                  <AccountBadge account={selectedAccount} />
                </View>
              ) : (
                <View style={styles.plusCircle}>
                  <Feather name="plus" size={18} color={ui.text} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.formStack}>
          <View style={styles.topSettingsRow}>
            <Pressable
              onPress={() => setPeriodPickerOpen(true)}
              style={({ pressed }) => [
                styles.settingCard,
                {
                  backgroundColor: ui.surface,
                  borderColor: ui.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <View style={styles.settingLabelRow}>
                <ThemedText style={[styles.settingLabel, { color: ui.text }]}>
                  Recurrence
                </ThemedText>
              </View>
              <View style={styles.settingValueRow}>
                <ThemedText style={[styles.settingValue, { color: ui.mutedText }]}>
                  {formatBudgetPeriodLabel(recurrence)}
                </ThemedText>
                <Feather name="chevron-down" size={14} color={ui.mutedText} />
              </View>
            </Pressable>

            <View
              style={[
                styles.settingCard,
                {
                  backgroundColor: ui.surface,
                  borderColor: ui.border,
                },
              ]}
            >
              <View style={styles.settingLabelRow}>
                <ThemedText style={[styles.settingLabel, { color: ui.text }]}>
                  Rollover
                </ThemedText>
                <Feather name="info" size={12} color={ui.mutedText} />
              </View>
              <Switch
                value={rolloverEnabled}
                onValueChange={setRolloverEnabled}
                trackColor={{ false: "#D8D8DE", true: "#C8C8CE" }}
                thumbColor={rolloverEnabled ? "#FFFFFF" : "#F5F5F5"}
                style={{ alignSelf: "flex-end" }}
              />
            </View>
          </View>

          <DateTimePickerField
            label="Start Date"
            value={parseLocalDate(startDate)}
            onChange={(value) => setStartDate(toLocalISOString(value))}
            ui={ui}
          />

          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: ui.text }]}>
              Expenses
            </ThemedText>
            <Pressable
              onPress={() => setCategoryPickerOpen(true)}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: ui.surface,
                  borderColor: ui.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.addButtonText, { color: ui.text }]}>
                ADD
              </ThemedText>
            </Pressable>
          </View>

          <View
            style={[
              styles.tableCard,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
              },
            ]}
          >
            <View style={[styles.tableHeader, { borderBottomColor: ui.border }]}>
              <ThemedText style={[styles.headerName, { color: ui.text }]}>Name</ThemedText>
              <ThemedText style={[styles.headerMetric, { color: ui.mutedText }]}>
                Budgeted
              </ThemedText>
              <ThemedText style={[styles.headerMetric, { color: ui.mutedText }]}>
                Available
              </ThemedText>
              <Feather name="minus-circle" size={14} color={ui.mutedText} />
            </View>

            {drafts.length === 0 ? (
              <View style={styles.emptyCategoryState}>
                <ThemedText style={{ color: ui.mutedText }}>
                  Add expense categories to build this budget.
                </ThemedText>
              </View>
            ) : (
              drafts.map((draft) => {
                const parsedAmount = Number(draft.limit_amount);
                const spent = spentByCategory[draft.expense_category_id] ?? 0;
                const available =
                  (Number.isFinite(parsedAmount) ? parsedAmount : 0) - Number(spent);

                return (
                  <View key={draft.localKey} style={styles.tableRow}>
                    <View style={styles.nameColumn}>
                      <ThemedText style={[styles.rowTitle, { color: ui.text }]}>
                        {draft.category_name}
                      </ThemedText>
                      {mode === "edit" ? (
                        <ThemedText style={[styles.rowFootnote, { color: ui.mutedText }]}>
                          Spent {formatMoney(spent)}
                        </ThemedText>
                      ) : null}
                    </View>

                    <TextInput
                      value={draft.limit_amount}
                      onChangeText={(value) =>
                        setDrafts((current) =>
                          current.map((entry) =>
                            entry.localKey === draft.localKey
                              ? { ...entry, limit_amount: value }
                              : entry,
                          ),
                        )
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={ui.mutedText}
                      style={[
                        styles.amountInput,
                        {
                          color: ui.text,
                          borderColor: ui.border,
                          backgroundColor: ui.bg,
                        },
                      ]}
                    />

                    <ThemedText
                      style={[
                        styles.rowMetric,
                        {
                          color: available < 0 ? "#D55C4B" : ui.text,
                        },
                      ]}
                    >
                      {formatMoney(available)}
                    </ThemedText>

                    <Pressable
                      onPress={() =>
                        setDrafts((current) =>
                          current.filter((entry) => entry.localKey !== draft.localKey),
                        )
                      }
                      hitSlop={8}
                    >
                      <Feather name="minus-circle" size={16} color={ui.text} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>

          {mode === "edit" ? (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  backgroundColor: ui.surface,
                  borderColor: ui.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.deleteButtonText, { color: "#D55C4B" }]}>
                Delete Budget
              </ThemedText>
            </Pressable>
          ) : null}

          {startDate ? (
            <ThemedText style={[styles.dateFootnote, { color: ui.mutedText }]}>
              Budget window ends {formatLongDate(getBudgetEndDate(startDate, recurrence))}
            </ThemedText>
          ) : null}
        </View>
      </ScrollView>

      <SelectionModal
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        title="Add Expense"
        ui={ui}
      >
        {availableCategories.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => handleAddCategory(category)}
            style={({ pressed }) => [
              styles.modalRow,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <ThemedText style={{ color: ui.text }}>
              {category.category_name ?? "Expense"}
            </ThemedText>
            <Feather name="plus" size={14} color={ui.text} />
          </Pressable>
        ))}
      </SelectionModal>

      <SelectionModal
        visible={periodPickerOpen}
        onClose={() => setPeriodPickerOpen(false)}
        title="Select Recurrence"
        ui={ui}
      >
        {PERIOD_OPTIONS.map((period) => {
          const isSelected = period === recurrence;
          return (
            <Pressable
              key={period}
              onPress={() => {
                setRecurrence(period);
                setPeriodPickerOpen(false);
              }}
              style={({ pressed }) => [
                styles.modalRow,
                {
                  backgroundColor: isSelected ? ui.surface2 : ui.surface,
                  borderColor: ui.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <ThemedText style={{ color: ui.text }}>
                {formatBudgetPeriodLabel(period)}
              </ThemedText>
              {isSelected ? <Feather name="check" size={14} color={ui.text} /> : null}
            </Pressable>
          );
        })}
      </SelectionModal>
    </>
  );
}

function AccountBadge({ account }: { account: BudgetSelectableAccount }) {
  const colorIndex = Math.abs(account.name.length) % AVATAR_COLORS.length;
  return (
    <View style={[styles.accountBadge, { backgroundColor: AVATAR_COLORS[colorIndex] }]}>
      <ThemedText style={styles.accountBadgeText}>{getInitials(account.name)}</ThemedText>
    </View>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tabsTheme.ui.bg,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  heroWrap: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FFD38F",
    boxShadow: "0 10px 16px rgba(0, 0, 0, 0.14)",
  },
  heroPanel: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: "center",
    gap: 8,
  },
  heroNameInput: {
    minWidth: 180,
    textAlign: "center",
    fontSize: 28,
    paddingVertical: 0,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
    textDecorationLine: "underline",
  },
  heroAmount: {
    fontSize: 50,
    lineHeight: 54,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
    fontVariant: ["tabular-nums"],
  },
  linkAccountWrap: {
    alignItems: "center",
    gap: 6,
  },
  linkAccountLabel: {
    fontSize: 15,
    fontFamily: Tokens.font.family,
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  accountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  accountBadgeText: {
    color: "#1C1C1C",
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  formStack: {
    paddingHorizontal: 16,
    gap: 18,
  },
  topSettingsRow: {
    flexDirection: "row",
    gap: 12,
  },
  settingCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  settingLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  settingValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: Tokens.font.family,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 26,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.headingFamily,
  },
  addButton: {
    minWidth: 72,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  addButtonText: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  tableCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerName: {
    flex: 1,
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  headerMetric: {
    width: 78,
    textAlign: "right",
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameColumn: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontFamily: Tokens.font.family,
  },
  rowFootnote: {
    fontSize: 10,
    fontFamily: Tokens.font.family,
  },
  amountInput: {
    width: 78,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    textAlign: "center",
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: Tokens.font.family,
  },
  rowMetric: {
    width: 78,
    textAlign: "right",
    fontSize: 13,
    fontFamily: Tokens.font.family,
    fontVariant: ["tabular-nums"],
  },
  emptyCategoryState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  deleteButton: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  dateFootnote: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: Tokens.font.family,
  },
  modalRow: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
