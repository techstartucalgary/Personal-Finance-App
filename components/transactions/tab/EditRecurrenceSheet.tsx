import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SelectionModal } from "@/components/ui/SelectionModal";
import {
  addCategory,
  addSubcategory,
  deleteCategory,
  deleteSubcategory,
  listSubcategories,
} from "@/utils/categories";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { deleteRecurringRule, updateRecurringRule } from "@/utils/recurring";

import { styles } from "./styles";
import type {
  CategoryRow,
  RecurringRule,
  SubcategoryRow,
  TransactionsUi,
} from "./types";

type EditRecurrenceSheetProps = {
  editingRule: RecurringRule | null;
  onClose: () => void;
  ui: TransactionsUi;
  isDark: boolean;
  insets: EdgeInsets;
  userId?: string;
  categories: CategoryRow[];
  onRefreshCategories: () => Promise<void>;
  onRefreshRules: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
};

// Full-screen sheet for editing recurring rules plus supporting pickers.
export function EditRecurrenceSheet({
  editingRule,
  onClose,
  ui,
  isDark,
  insets,
  userId,
  categories,
  onRefreshCategories,
  onRefreshRules,
  isLoading,
  setIsLoading,
}: EditRecurrenceSheetProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const [editRuleName, setEditRuleName] = useState("");
  const [editRuleAmount, setEditRuleAmount] = useState("");
  const [editRuleFrequency, setEditRuleFrequency] = useState("Monthly");
  const [editRuleEndsOn, setEditRuleEndsOn] = useState("");
  const [editRuleNextRunDate, setEditRuleNextRunDate] = useState("");
  const [editRuleSelectedCategory, setEditRuleSelectedCategory] =
    useState<CategoryRow | null>(null);
  const [editRuleSubcategories, setEditRuleSubcategories] = useState<
    SubcategoryRow[]
  >([]);
  const [editRuleSelectedSubcategory, setEditRuleSelectedSubcategory] =
    useState<SubcategoryRow | null>(null);

  const [editRuleFrequencyModalOpen, setEditRuleFrequencyModalOpen] =
    useState(false);
  const [editRuleCategoryModalOpen, setEditRuleCategoryModalOpen] =
    useState(false);
  const [editRuleSubcategoryModalOpen, setEditRuleSubcategoryModalOpen] =
    useState(false);

  // Keep the form in sync with the selected rule.
  useEffect(() => {
    if (!editingRule) return;

    setEditRuleName(editingRule.name || "");
    setEditRuleAmount(editingRule.amount?.toString() || "");
    setEditRuleFrequency(editingRule.frequency || "Monthly");
    setEditRuleEndsOn(editingRule.end_date || "");
    setEditRuleNextRunDate(editingRule.next_run_date || "");

    const categoryMatch = categories.find(
      (category) => category.id === editingRule.expense_categoryid,
    );
    setEditRuleSelectedCategory(categoryMatch ?? null);

    if (categoryMatch && editingRule.subcategory_id && userId) {
      listSubcategories({
        profile_id: userId,
        category_id: categoryMatch.id,
      }).then((subcategories) => {
        setEditRuleSubcategories((subcategories as SubcategoryRow[]) ?? []);
        const subMatch = (subcategories as SubcategoryRow[]).find(
          (sub) => sub.id === editingRule.subcategory_id,
        );
        setEditRuleSelectedSubcategory(subMatch ?? null);
      });
    } else {
      setEditRuleSelectedSubcategory(null);
    }
  }, [editingRule, categories, userId]);

  const createEditCategory = useCallback(async () => {
    if (!userId) return;
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert("Category name required", "Enter a category name.");
      return;
    }

    try {
      const data = await addCategory({
        profile_id: userId,
        category_name: trimmed,
      });

      setNewCategoryName("");
      setEditRuleSelectedCategory(data as CategoryRow);
      await onRefreshCategories();
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Could not create category", "Please try again.");
    }
  }, [newCategoryName, onRefreshCategories, userId]);

  const createEditSubcategory = useCallback(async () => {
    if (!userId || !editRuleSelectedCategory) return;
    const trimmed = newSubcategoryName.trim();
    if (!trimmed) {
      Alert.alert("Subcategory name required", "Enter a name.");
      return;
    }
    try {
      const data = await addSubcategory({
        profile_id: userId,
        category_id: editRuleSelectedCategory.id,
        category_name: trimmed,
      });
      setNewSubcategoryName("");
      setEditRuleSelectedSubcategory(data as SubcategoryRow);

      const subcategories = await listSubcategories({
        profile_id: userId,
        category_id: editRuleSelectedCategory.id,
      });
      setEditRuleSubcategories((subcategories as SubcategoryRow[]) ?? []);
    } catch (error) {
      console.error("Error creating subcategory", error);
      Alert.alert("Error", "Could not create subcategory.");
    }
  }, [editRuleSelectedCategory, newSubcategoryName, userId]);

  const handleDeleteCategory = useCallback(
    async (categoryId: number) => {
      if (!userId) return;
      Alert.alert(
        "Delete category?",
        "This will also delete the subcategories.\n\nTransactions using this category will be preserved but uncategorized.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteCategory({ id: categoryId, profile_id: userId });
                await onRefreshCategories();
                if (editRuleSelectedCategory?.id === categoryId) {
                  setEditRuleSelectedCategory(null);
                  setEditRuleSubcategories([]);
                  setEditRuleSelectedSubcategory(null);
                }
              } catch (error) {
                console.error("Error deleting category:", error);
                Alert.alert("Error", "Could not delete category.");
              }
            },
          },
        ],
      );
    },
    [editRuleSelectedCategory, onRefreshCategories, userId],
  );

  const handleDeleteSubcategory = useCallback(
    async (subcategoryId: number) => {
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
                await deleteSubcategory({
                  id: subcategoryId,
                  profile_id: userId,
                });
                if (editRuleSelectedCategory) {
                  const editSubcategories = await listSubcategories({
                    profile_id: userId,
                    category_id: editRuleSelectedCategory.id,
                  });
                  setEditRuleSubcategories(editSubcategories);
                }

                if (editRuleSelectedSubcategory?.id === subcategoryId) {
                  setEditRuleSelectedSubcategory(null);
                }
              } catch (error) {
                console.error("Error deleting subcategory:", error);
                Alert.alert("Error", "Could not delete subcategory.");
              }
            },
          },
        ],
      );
    },
    [editRuleSelectedCategory, editRuleSelectedSubcategory, userId],
  );

  const handleDeleteRule = useCallback(
    (ruleId: number) => {
      if (!userId) return;

      Alert.alert(
        "Delete Recurrence?",
        "This action will permanently delete this recurring rule.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setIsLoading(true);
              try {
                await deleteRecurringRule({ id: ruleId, profile_id: userId });
                await onRefreshRules();
                onClose();
              } catch (error) {
                console.error("Error deleting rule:", error);
                Alert.alert("Error", "Could not delete this recurrence.");
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
      );
    },
    [onClose, onRefreshRules, setIsLoading, userId],
  );

  const handleSaveRuleEdit = useCallback(
    async (statusOverride?: boolean) => {
      if (!userId || !editingRule) return;

      if (!editRuleAmount || isNaN(parseFloat(editRuleAmount))) {
        Alert.alert("Invalid Amount", "Please enter a valid amount.");
        return;
      }

      setIsLoading(true);
      try {
        await updateRecurringRule({
          id: editingRule.id,
          profile_id: userId,
          update: {
            name: editRuleName || undefined,
            amount: parseFloat(editRuleAmount),
            frequency: editRuleFrequency as any,
            end_date: editRuleEndsOn.trim() ? editRuleEndsOn.trim() : null,
            next_run_date: editRuleNextRunDate.trim()
              ? editRuleNextRunDate.trim()
              : undefined,
            expense_categoryid: editRuleSelectedCategory?.id || undefined,
            subcategory_id: editRuleSelectedSubcategory?.id || undefined,
            is_active:
              statusOverride !== undefined
                ? statusOverride
                : editingRule.is_active,
          },
        });
        onClose();
        await onRefreshRules();
      } catch (error) {
        console.error("Error updating rule:", error);
        Alert.alert("Error", "Could not update the recurrence.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      editRuleAmount,
      editRuleEndsOn,
      editRuleFrequency,
      editRuleName,
      editRuleNextRunDate,
      editRuleSelectedCategory,
      editRuleSelectedSubcategory,
      editingRule,
      onClose,
      onRefreshRules,
      setIsLoading,
      userId,
    ],
  );

  return (
    <>
      <Modal
        visible={!!editingRule}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <ThemedView
          style={{
            flex: 1,
            backgroundColor: ui.surface,
            padding: 16,
            paddingTop: Platform.OS === "ios" ? 12 : 16 + insets.top,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft} />
            <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>
              Edit Recurrence
            </ThemedText>
            <View style={styles.modalHeaderRight}>
              <Pressable
                onPress={onClose}
                hitSlop={20}
                style={[
                  styles.modalCloseButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <Feather name="x" size={18} color={ui.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <ThemedText type="defaultSemiBold">Description</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: ui.border,
                      color: ui.text,
                      backgroundColor: ui.surface2,
                    },
                  ]}
                  value={editRuleName}
                  onChangeText={setEditRuleName}
                  placeholder="ex. Netflix"
                  placeholderTextColor={ui.mutedText}
                />
              </View>

              <View style={{ gap: 6 }}>
                <ThemedText type="defaultSemiBold">Amount</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: ui.border,
                      color: ui.text,
                      backgroundColor: ui.surface2,
                    },
                  ]}
                  value={editRuleAmount}
                  onChangeText={setEditRuleAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={ui.mutedText}
                />
              </View>

              <View style={{ gap: 6 }}>
                <ThemedText type="defaultSemiBold">Category</ThemedText>
                <Pressable
                  onPress={() => setEditRuleCategoryModalOpen(true)}
                  style={[
                    styles.dropdownButton,
                    { borderColor: ui.border, backgroundColor: ui.surface2 },
                  ]}
                >
                  <ThemedText>
                    {editRuleSelectedCategory?.category_name ??
                      "Select Category"}
                  </ThemedText>
                </Pressable>
              </View>

              {editRuleSelectedCategory && (
                <View style={{ gap: 6 }}>
                  <ThemedText type="defaultSemiBold">Subcategory</ThemedText>
                  <Pressable
                    onPress={() => setEditRuleSubcategoryModalOpen(true)}
                    style={[
                      styles.dropdownButton,
                      { borderColor: ui.border, backgroundColor: ui.surface2 },
                    ]}
                  >
                    <ThemedText>
                      {editRuleSelectedSubcategory?.category_name ??
                        "None (Optional)"}
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              <View style={{ gap: 6 }}>
                <ThemedText type="defaultSemiBold">Frequency</ThemedText>
                <Pressable
                  onPress={() => setEditRuleFrequencyModalOpen(true)}
                  style={[
                    styles.dropdownButton,
                    { borderColor: ui.border, backgroundColor: ui.surface2 },
                  ]}
                >
                  <ThemedText>{editRuleFrequency}</ThemedText>
                </Pressable>
              </View>

              <DateTimePickerField
                label="Ends On (Optional)"
                value={parseLocalDate(editRuleEndsOn)}
                onChange={(date) => setEditRuleEndsOn(toLocalISOString(date))}
                ui={ui}
              />

              <DateTimePickerField
                label="Next Run Date"
                value={parseLocalDate(editRuleNextRunDate)}
                onChange={(date) =>
                  setEditRuleNextRunDate(toLocalISOString(date))
                }
                ui={ui}
              />
            </View>

            <Pressable
              onPress={() => handleSaveRuleEdit()}
              disabled={isLoading}
              style={[
                styles.button,
                {
                  backgroundColor: ui.text,
                  width: "100%",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderRadius: 24,
                  marginTop: 12,
                },
                isLoading && styles.buttonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={ui.surface} />
              ) : (
                <ThemedText style={{ color: ui.surface, fontWeight: "600" }}>
                  Save Changes
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              onPress={() =>
                handleSaveRuleEdit(
                  editingRule ? !editingRule.is_active : undefined,
                )
              }
              disabled={isLoading}
              style={[
                styles.deleteAction,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface2,
                  paddingVertical: 12,
                  borderRadius: 24,
                },
                isLoading && styles.buttonDisabled,
              ]}
            >
              <ThemedText style={{ color: ui.text, fontWeight: "600" }}>
                {editingRule?.is_active ? "Pause" : "Resume"}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() =>
                editingRule?.id ? handleDeleteRule(editingRule.id) : null
              }
              disabled={isLoading}
              style={[
                styles.deleteAction,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface2,
                  borderRadius: 24,
                },
                isLoading && styles.buttonDisabled,
              ]}
            >
              <ThemedText style={{ color: ui.danger, fontWeight: "600" }}>
                Delete Recurrence
              </ThemedText>
            </Pressable>
          </ScrollView>
        </ThemedView>
      </Modal>

      <SelectionModal
        visible={editRuleFrequencyModalOpen}
        onClose={() => setEditRuleFrequencyModalOpen(false)}
        title="Select Frequency"
        ui={ui}
      >
        {["Daily", "Weekly", "Monthly", "Yearly"].map((freq) => (
          <Pressable
            key={freq}
            style={[
              styles.modalOption,
              { borderColor: ui.border, backgroundColor: ui.surface },
            ]}
            onPress={() => {
              setEditRuleFrequency(freq);
              setEditRuleFrequencyModalOpen(false);
            }}
          >
            <ThemedText>{freq}</ThemedText>
          </Pressable>
        ))}
      </SelectionModal>

      <SelectionModal
        visible={editRuleCategoryModalOpen}
        onClose={() => setEditRuleCategoryModalOpen(false)}
        title="Select Category"
        ui={ui}
        layout="tags"
        footer={
          <View style={styles.footerRow}>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="New category name"
              placeholderTextColor={ui.mutedText}
              style={[
                styles.footerInput,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface,
                  color: ui.text,
                },
              ]}
            />
            <Pressable
              onPress={createEditCategory}
              style={({ pressed }) => [
                styles.footerAddButton,
                {
                  backgroundColor: ui.accent,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="plus" size={24} color={ui.surface} />
            </Pressable>
          </View>
        }
      >
        {categories.length === 0 ? (
          <ThemedText style={{ textAlign: "center", padding: 20 }}>
            No categories yet.
          </ThemedText>
        ) : (
          categories.map((category) => (
            <View
              key={category.id}
              style={[
                styles.tag,
                {
                  borderColor: ui.border,
                  backgroundColor:
                    editRuleSelectedCategory?.id === category.id
                      ? ui.accentSoft
                      : ui.surface2,
                },
              ]}
            >
              <Pressable
                style={{ paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}
                onPress={() => {
                  setEditRuleSelectedCategory(category);
                  setEditRuleSelectedSubcategory(null);
                  setEditRuleCategoryModalOpen(false);
                }}
              >
                <ThemedText
                  style={{
                    color:
                      editRuleSelectedCategory?.id === category.id
                        ? ui.accent
                        : ui.text,
                    fontWeight: "500",
                  }}
                >
                  {category.category_name ?? "Unnamed"}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleDeleteCategory(category.id)}
                style={{ padding: 8, paddingRight: 10 }}
              >
                <Feather name="x" size={16} color={ui.mutedText} />
              </Pressable>
            </View>
          ))
        )}
      </SelectionModal>

      <SelectionModal
        visible={editRuleSubcategoryModalOpen}
        onClose={() => setEditRuleSubcategoryModalOpen(false)}
        title="Select Subcategory"
        ui={ui}
        layout="tags"
        footer={
          <View style={styles.footerRow}>
            <TextInput
              value={newSubcategoryName}
              onChangeText={setNewSubcategoryName}
              placeholder="New subcategory name"
              placeholderTextColor={ui.mutedText}
              style={[
                styles.footerInput,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface,
                  color: ui.text,
                },
              ]}
            />
            <Pressable
              onPress={createEditSubcategory}
              style={({ pressed }) => [
                styles.footerAddButton,
                {
                  backgroundColor: ui.accent,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="plus" size={24} color={ui.surface} />
            </Pressable>
          </View>
        }
      >
        {editRuleSubcategories.length === 0 ? (
          <ThemedText style={{ textAlign: "center", padding: 20 }}>
            No subcategories found.
          </ThemedText>
        ) : (
          editRuleSubcategories.map((subcategory) => (
            <View
              key={subcategory.id}
              style={[
                styles.tag,
                {
                  borderColor: ui.border,
                  backgroundColor:
                    editRuleSelectedSubcategory?.id === subcategory.id
                      ? ui.accentSoft
                      : ui.surface2,
                },
              ]}
            >
              <Pressable
                style={{ paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}
                onPress={() => {
                  setEditRuleSelectedSubcategory(subcategory);
                  setEditRuleSubcategoryModalOpen(false);
                }}
              >
                <ThemedText
                  style={{
                    color:
                      editRuleSelectedSubcategory?.id === subcategory.id
                        ? ui.accent
                        : ui.text,
                    fontWeight: "500",
                  }}
                >
                  {subcategory.category_name ?? "Unnamed"}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleDeleteSubcategory(subcategory.id)}
                style={{ padding: 8, paddingRight: 10 }}
              >
                <Feather name="x" size={16} color={ui.mutedText} />
              </Pressable>
            </View>
          ))
        )}
      </SelectionModal>
    </>
  );
}
