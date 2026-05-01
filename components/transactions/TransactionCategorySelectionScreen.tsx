import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useMemo, useState } from "react";
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

import type { CategoryRow } from "@/components/AddTransactionModal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { setPendingTransactionCategorySelection } from "@/components/transactions/pending-transaction-category-selection";
import {
  getCategorySuggestions,
  resolveCategorySuggestion,
  type CategorySuggestion,
  type TransactionType,
} from "@/components/transactions/transaction-classification-options";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import { addCategory, deleteCategory, listCategories } from "@/utils/categories";

type Ui = ReturnType<typeof useThemeUI>;

type Props = {
  currentCategoryId?: number | null;
  transactionType?: TransactionType;
  onSelectCategory: (category: CategoryRow) => void;
  uiOverride?: Ui;
};

export function TransactionCategorySelectionScreen({
  currentCategoryId = null,
  transactionType = "expense",
  onSelectCategory,
  uiOverride,
}: Props) {
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const themeUi = useThemeUI();
  const ui = uiOverride ?? themeUi;
  const userId = session?.user.id;
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingLabel, setCreatingLabel] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  const isDark = ui.bg === "#000000" || ui.bg === "#1C1C1E" || ui.bg === "#1B1B1E";
  const suggestions = getCategorySuggestions(transactionType);

  const loadCategories = async () => {
    if (!userId) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const rows = await listCategories({ profile_id: userId });
      setCategories(((rows as CategoryRow[]) ?? []).slice().sort((a, b) => {
        return (a.category_name ?? "").localeCompare(b.category_name ?? "");
      }));
    } catch (error) {
      console.error("Error loading categories for selection:", error);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [userId]);

  const suggestedCategories = useMemo(() => {
    const existingNames = new Set(
      categories.map((category) => (category.category_name ?? "").trim().toLowerCase()),
    );
    return suggestions.filter(
      (suggestion) => !existingNames.has(suggestion.label.toLowerCase()),
    );
  }, [categories, suggestions]);

  const resolveCategoryIcon = (category: CategoryRow) => {
    const match = resolveCategorySuggestion(category.category_name);
    return match ?? { label: "Other", icon: "tag" as const, color: ui.accent ?? "#4C6EF5" };
  };

  const handleSuggestedCategory = async (suggestion: CategorySuggestion) => {
    if (!userId || creatingLabel) return;
    try {
      setCreatingLabel(suggestion.label);
      const category = await addCategory({
        profile_id: userId,
        category_name: suggestion.label,
      });
      onSelectCategory(category as CategoryRow);
    } catch (error) {
      console.error("Error creating suggested category:", error);
    } finally {
      setCreatingLabel(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!userId || creatingLabel) return;
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert("Category name required", "Enter a category name.");
      return;
    }

    const existing = categories.find(
      (category) =>
        (category.category_name ?? "").trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      onSelectCategory(existing);
      return;
    }

    try {
      setCreatingLabel(trimmed);
      const category = await addCategory({
        profile_id: userId,
        category_name: trimmed,
      });
      setNewCategoryName("");
      onSelectCategory(category as CategoryRow);
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Could not create category", "Please try again.");
    } finally {
      setCreatingLabel(null);
    }
  };

  const handleDeleteCategory = (category: CategoryRow) => {
    if (!userId) return;

    Alert.alert(
      "Delete category?",
      "Transactions using this category will be preserved but uncategorized.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingCategoryId(category.id);
              await deleteCategory({ id: category.id, profile_id: userId });
              if (currentCategoryId === category.id) {
                setPendingTransactionCategorySelection(null);
              }
              await loadCategories();
            } catch (error) {
              console.error("Error deleting category:", error);
              Alert.alert("Error", "Could not delete category.");
            } finally {
              setDeletingCategoryId(null);
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
            SELECT CATEGORY
          </ThemedText>
        </View>

        <View style={[styles.createCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
          <TextInput
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="New category name"
            placeholderTextColor={ui.mutedText}
            returnKeyType="done"
            onSubmitEditing={handleCreateCategory}
            style={[
              styles.createInput,
              {
                color: ui.text,
                backgroundColor: isDark ? ui.surface2 : "#F2F2F7",
              },
            ]}
          />
          <Pressable
            onPress={handleCreateCategory}
            disabled={Boolean(creatingLabel)}
            style={({ pressed }) => [
              styles.createButton,
              {
                backgroundColor: ui.text,
                opacity: pressed ? 0.75 : creatingLabel ? 0.5 : 1,
              },
            ]}
          >
            {creatingLabel && creatingLabel === newCategoryName.trim() ? (
              <ActivityIndicator size="small" color={ui.surface} />
            ) : (
              <Feather name="plus" size={18} color={ui.surface} />
            )}
          </Pressable>
        </View>

        <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={ui.accent} />
            </View>
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={{ color: ui.mutedText }}>No categories yet.</ThemedText>
            </View>
          ) : (
            categories.map((category, index) => {
              const isSelected = currentCategoryId === category.id;
              const categoryIcon = resolveCategoryIcon(category);
              return (
                <React.Fragment key={category.id}>
                  <Pressable
                    onPress={() => onSelectCategory(category)}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
                  >
                    <View style={styles.rowLeading}>
                      <View
                        style={[
                          styles.iconWrap,
                          {
                            backgroundColor: isSelected
                              ? ui.accentSoft
                              : categoryIcon.color,
                          },
                        ]}
                      >
                        <Feather
                          name={categoryIcon.icon}
                          size={18}
                          color={isSelected ? ui.accent : "#FFFFFF"}
                        />
                      </View>
                      <ThemedText style={[styles.title, { color: ui.text }]}>
                        {category.category_name ?? "Unnamed"}
                      </ThemedText>
                    </View>

                    <View style={styles.rowActions}>
                      {isSelected ? (
                        <IconSymbol name="checkmark" size={18} color={ui.accent} />
                      ) : null}
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          handleDeleteCategory(category);
                        }}
                        disabled={deletingCategoryId === category.id}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.deleteButton,
                          { opacity: pressed ? 0.6 : deletingCategoryId === category.id ? 0.45 : 1 },
                        ]}
                      >
                        {deletingCategoryId === category.id ? (
                          <ActivityIndicator size="small" color={ui.danger ?? "#D32F2F"} />
                        ) : (
                          <Feather name="trash-2" size={16} color={ui.danger ?? "#D32F2F"} />
                        )}
                      </Pressable>
                    </View>
                  </Pressable>

                  {index < categories.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: ui.border }]} />
                  )}
                </React.Fragment>
              );
            })
          )}
        </View>

        {suggestedCategories.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>
                SUGGESTED
              </ThemedText>
            </View>

            <View style={[styles.groupCard, { borderColor: ui.border, backgroundColor: ui.surface }]}>
              {suggestedCategories.map((suggestion, index) => (
                <React.Fragment key={suggestion.label}>
                  <Pressable
                    onPress={() => handleSuggestedCategory(suggestion)}
                    disabled={Boolean(creatingLabel)}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : creatingLabel ? 0.5 : 1 }]}
                  >
                    <View style={styles.rowLeading}>
                      <View style={[styles.iconWrap, { backgroundColor: suggestion.color }]}>
                        <Feather name={suggestion.icon} size={18} color="#FFFFFF" />
                      </View>
                      <ThemedText style={[styles.title, { color: ui.text }]}>
                        {suggestion.label}
                      </ThemedText>
                    </View>

                    {creatingLabel === suggestion.label ? (
                      <ActivityIndicator size="small" color={ui.accent} />
                    ) : (
                      <Feather name="plus" size={18} color={ui.mutedText} />
                    )}
                  </Pressable>

                  {index < suggestedCategories.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: ui.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
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
  createCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  createInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
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
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
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
