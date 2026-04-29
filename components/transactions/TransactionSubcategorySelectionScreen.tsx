import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SubcategoryRow } from "@/components/AddTransactionModal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { setPendingTransactionSubcategorySelection } from "@/components/transactions/pending-transaction-subcategory-selection";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { addSubcategory, deleteSubcategory, listSubcategories } from "@/utils/categories";

type Ui = ReturnType<typeof useThemeUI>;
type TransactionType = "expense" | "income" | "transfer";
type SubcategoryMap = Record<string, string[]>;

type Props = {
  categoryId?: number | null;
  categoryName?: string | null;
  currentSubcategoryId?: number | null;
  transactionType?: TransactionType;
  onSelectSubcategory: (subcategory: SubcategoryRow | null) => void;
  uiOverride?: Ui;
};

const EXPENSE_SUBCATEGORIES: SubcategoryMap = {
  "Auto & Transport": [
    "Auto Payment",
    "Public Transit",
    "Gas",
    "Auto Maintenance",
    "Parking & Tolls",
    "Taxi & Ride Shares",
  ],
  Housing: ["Mortgage", "Rent", "Home Improvement", "HOA Fees", "Property Tax"],
  "Bills & Utilities": [
    "Electricity",
    "Water",
    "Internet",
    "Phone",
    "Gas",
    "Garbage",
  ],
  "Food & Dining": ["Restaurants", "Cafe", "Takeout", "Delivery"],
  Groceries: ["Supermarket", "Farmers Market", "Snacks", "Household"],
  Shopping: ["Clothing", "Electronics", "Home Goods", "Personal Care"],
  "Health & Fitness": ["Pharmacy", "Doctor", "Dental", "Gym"],
  Entertainment: ["Movies", "Games", "Streaming", "Events"],
  Travel: ["Flights", "Hotels", "Transit", "Car Rental"],
  "Gifts & Donations": ["Charity", "Gifts"],
  Other: ["Misc", "One-time", "Recurring"],
};

const INCOME_SUBCATEGORIES: SubcategoryMap = {
  Salary: ["Paychecks", "Bonuses", "Commission"],
  "Business Income": ["Sales", "Services", "Other"],
  Freelance: ["Projects", "Consulting", "Contract"],
  Investments: ["Dividends", "Capital Gains", "Interest"],
  Interest: ["Bank Interest", "Cashback", "Savings Interest"],
  Gifts: ["Gifts", "Donations", "Support"],
  "Rental Income": ["Rent", "Lease", "Airbnb"],
  Refunds: ["Returns", "Reimbursements", "Tax Refund"],
  Bonuses: ["Annual Bonus", "Performance Bonus", "Referral Bonus"],
  "Other Income": ["Other", "Misc", "One-time"],
  Other: ["Other", "Misc", "One-time"],
};

function getSuggestedSubcategories(
  categoryName: string | null | undefined,
  transactionType: TransactionType,
) {
  const name = (categoryName ?? "").trim();
  if (!name) return [];
  const source = transactionType === "income"
    ? INCOME_SUBCATEGORIES
    : EXPENSE_SUBCATEGORIES;
  const exact = Object.keys(source).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  if (exact) return source[exact];
  const partial = Object.keys(source).find((key) =>
    name.toLowerCase().includes(key.toLowerCase()),
  );
  if (partial) return source[partial];
  return source.Other ?? [];
}

export function TransactionSubcategorySelectionScreen({
  categoryId = null,
  categoryName = null,
  currentSubcategoryId = null,
  transactionType = "expense",
  onSelectSubcategory,
  uiOverride,
}: Props) {
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const themeUi = useThemeUI();
  const ui = uiOverride ?? themeUi;
  const userId = session?.user.id;
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [creatingLabel, setCreatingLabel] = useState<string | null>(null);
  const [deletingSubcategoryId, setDeletingSubcategoryId] = useState<number | null>(null);
  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E" || ui.bg === "#1B1B1E";

  const loadSubcategories = useCallback(async () => {
    if (!userId || !categoryId) {
      setSubcategories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const rows = await listSubcategories({ profile_id: userId, category_id: categoryId });
      setSubcategories(((rows as SubcategoryRow[]) ?? []).slice().sort((a, b) => {
        return (a.category_name ?? "").localeCompare(b.category_name ?? "");
      }));
    } catch (error) {
      console.error("Error loading subcategories for selection:", error);
      setSubcategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, userId]);

  useEffect(() => {
    loadSubcategories();
  }, [loadSubcategories]);

  const suggestedSubcategories = useMemo(() => {
    const existingNames = new Set(
      subcategories.map((subcategory) =>
        (subcategory.category_name ?? "").trim().toLowerCase(),
      ),
    );
    return getSuggestedSubcategories(categoryName, transactionType).filter(
      (label) => !existingNames.has(label.toLowerCase()),
    );
  }, [categoryName, subcategories, transactionType]);

  const handleCreateSubcategory = async (label: string) => {
    if (!userId || !categoryId || creatingLabel) return;
    const trimmed = label.trim();
    if (!trimmed) {
      Alert.alert("Subcategory name required", "Enter a subcategory name.");
      return;
    }

    const existing = subcategories.find(
      (subcategory) =>
        (subcategory.category_name ?? "").trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      onSelectSubcategory(existing);
      return;
    }

    try {
      setCreatingLabel(trimmed);
      const subcategory = await addSubcategory({
        profile_id: userId,
        category_id: categoryId,
        category_name: trimmed,
      });
      setNewSubcategoryName("");
      onSelectSubcategory(subcategory as SubcategoryRow);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      Alert.alert("Could not create subcategory", "Please try again.");
    } finally {
      setCreatingLabel(null);
    }
  };

  const handleDeleteSubcategory = (subcategory: SubcategoryRow) => {
    if (!userId) return;

    Alert.alert(
      "Delete subcategory?",
      "Transactions using this subcategory will be set to no subcategory.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingSubcategoryId(subcategory.id);
              await deleteSubcategory({ id: subcategory.id, profile_id: userId });
              if (currentSubcategoryId === subcategory.id) {
                setPendingTransactionSubcategorySelection(null);
              }
              await loadSubcategories();
            } catch (error) {
              console.error("Error deleting subcategory:", error);
              Alert.alert("Error", "Could not delete subcategory.");
            } finally {
              setDeletingSubcategoryId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor: ui.bg }}>
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
            SUBCATEGORY
          </ThemedText>
        </View>

        {!categoryId ? (
          <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
            <View style={styles.emptyState}>
              <ThemedText style={{ color: ui.mutedText }}>
                Select a category before choosing a subcategory.
              </ThemedText>
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
              <View style={styles.createRow}>
                <TextInput
                  value={newSubcategoryName}
                  onChangeText={setNewSubcategoryName}
                  placeholder="New subcategory name"
                  placeholderTextColor={ui.mutedText}
                  returnKeyType="done"
                  onSubmitEditing={() => handleCreateSubcategory(newSubcategoryName)}
                  style={[styles.createInput, { color: ui.text }]}
                />
                <Pressable
                  onPress={() => handleCreateSubcategory(newSubcategoryName)}
                  disabled={!newSubcategoryName.trim() || creatingLabel != null}
                  style={({ pressed }) => [
                    styles.createButton,
                    {
                      backgroundColor: ui.accent,
                      opacity: !newSubcategoryName.trim() || creatingLabel
                        ? 0.45
                        : pressed
                          ? 0.72
                          : 1,
                    },
                  ]}
                >
                  {creatingLabel === newSubcategoryName.trim() ? (
                    <ActivityIndicator size="small" color={ui.surface} />
                  ) : (
                    <IconSymbol name="plus" size={20} color={ui.surface} />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
              <Pressable
                onPress={() => onSelectSubcategory(null)}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
              >
                <View style={styles.rowLeading}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: isDark ? ui.surface2 : "#F2F2F7" },
                    ]}
                  >
                    <Feather name="x" size={17} color={ui.mutedText} />
                  </View>
                  <ThemedText style={[styles.title, { color: ui.text }]}>No subcategory</ThemedText>
                </View>
                {currentSubcategoryId == null ? (
                  <IconSymbol name="checkmark" size={18} color={ui.accent} />
                ) : null}
              </Pressable>

              <View style={[styles.separator, { backgroundColor: ui.border }]} />

              {isLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color={ui.accent} />
                </View>
              ) : subcategories.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: ui.mutedText }}>No subcategories yet.</ThemedText>
                </View>
              ) : (
                subcategories.map((subcategory, index) => {
                  const isSelected = currentSubcategoryId === subcategory.id;
                  return (
                    <React.Fragment key={subcategory.id}>
                      <Pressable
                        onPress={() => onSelectSubcategory(subcategory)}
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
                            <Feather
                              name="layers"
                              size={17}
                              color={isSelected ? ui.accent : ui.mutedText}
                            />
                          </View>
                          <ThemedText style={[styles.title, { color: ui.text }]}>
                            {subcategory.category_name ?? "Unnamed"}
                          </ThemedText>
                        </View>
                        <View style={styles.rowActions}>
                          {isSelected ? (
                            <IconSymbol name="checkmark" size={18} color={ui.accent} />
                          ) : null}
                          <Pressable
                            onPress={() => handleDeleteSubcategory(subcategory)}
                            disabled={deletingSubcategoryId === subcategory.id}
                            hitSlop={10}
                            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                          >
                            {deletingSubcategoryId === subcategory.id ? (
                              <ActivityIndicator size="small" color={ui.mutedText} />
                            ) : (
                              <Feather name="trash-2" size={18} color={ui.mutedText} />
                            )}
                          </Pressable>
                        </View>
                      </Pressable>
                      {index < subcategories.length - 1 ? (
                        <View style={[styles.separator, { backgroundColor: ui.border }]} />
                      ) : null}
                    </React.Fragment>
                  );
                })
              )}
            </View>

            {suggestedSubcategories.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>
                    SUGGESTED
                  </ThemedText>
                </View>
                <View style={styles.suggestionWrap}>
                  {suggestedSubcategories.map((label) => (
                    <Pressable
                      key={label}
                      onPress={() => handleCreateSubcategory(label)}
                      disabled={creatingLabel != null}
                      style={({ pressed }) => [
                        styles.suggestionPill,
                        {
                          borderColor: ui.border,
                          backgroundColor: ui.surface,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}
                    >
                      <Feather name="plus" size={14} color={ui.accent} />
                      <ThemedText style={[styles.suggestionText, { color: ui.text }]}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
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
  createRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  createInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  createButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    minHeight: 64,
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
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  emptyState: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  suggestionPill: {
    minHeight: 38,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
