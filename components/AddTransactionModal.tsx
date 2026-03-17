import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { DateTimePickerField } from "./ui/DateTimePickerField";
import { IconSymbol } from "./ui/icon-symbol";
import { SelectionModal } from "./ui/SelectionModal";

import { getAccountById, updateAccount } from "@/utils/accounts";
import {
  addCategory,
  addSubcategory,
  deleteCategory,
  deleteSubcategory,
  listSubcategories,
} from "@/utils/categories";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { addExpense } from "@/utils/expenses";
import { createRecurringRule } from "@/utils/recurring";

export type AccountRow = {
  id: number;
  account_name: string | null;
  account_type: string | null;
  balance: number | null;
  currency: string | null;
};

export type CategoryRow = {
  id: number;
  category_name: string | null;
};

export type SubcategoryRow = {
  id: number;
  category_name: string | null;
  expense_categoryid: number | null;
};

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountRow[];
  categories: CategoryRow[];
  onRefresh: () => Promise<void>;
  ui: any;
  isDark: boolean;
  userId: string | undefined;
}

export function AddTransactionModal({
  visible,
  onClose,
  accounts,
  categories,
  onRefresh,
  ui,
  isDark,
  userId,
}: AddTransactionModalProps) {
  const insets = useSafeAreaInsets();
  const amountInputRef = React.useRef<TextInput>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(toLocalISOString(new Date()));
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<SubcategoryRow | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("Monthly");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [addRuleEndsOn, setAddRuleEndsOn] = useState("");
  const [addRuleNextRunDate, setAddRuleNextRunDate] = useState("");

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [addFrequencyModalOpen, setAddFrequencyModalOpen] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setAmount("");
      setDescription("");
      setTransactionDate(toLocalISOString(new Date()));
      setSelectedAccount(null);
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSubcategories([]);
      setIsRecurring(false);
      setRecurringFrequency("Monthly");
      setHasEndDate(false);
      setAddRuleEndsOn("");
      setAddRuleNextRunDate("");
    }
  }, [visible]);

  // Recalculate default Next Run Date when Frequency or IsRecurring changes
  useEffect(() => {
    if (isRecurring) {
      const nextDate = new Date();
      if (recurringFrequency === "Daily") nextDate.setDate(nextDate.getDate() + 1);
      else if (recurringFrequency === "Weekly") nextDate.setDate(nextDate.getDate() + 7);
      else if (recurringFrequency === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (recurringFrequency === "Yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
      setAddRuleNextRunDate(toLocalISOString(nextDate));
    } else {
      setAddRuleNextRunDate("");
    }
  }, [isRecurring, recurringFrequency]);

  // Load subcategories when selectedCategory changes
  useEffect(() => {
    const fetchSub = async () => {
      if (!userId || !selectedCategory) {
        setSubcategories([]);
        setSelectedSubcategory(null);
        return;
      }
      try {
        const data = await listSubcategories({
          profile_id: userId,
          category_id: selectedCategory.id,
        });
        setSubcategories((data as SubcategoryRow[]) ?? []);
        setSelectedSubcategory(null);
      } catch (error) {
        console.error("Error loading subcategories:", error);
      }
    };
    fetchSub();
  }, [userId, selectedCategory]);

  const canCreate = useMemo(() => {
    const parsed = parseFloat(amount);
    return (
      !!userId &&
      !!selectedAccount &&
      !!selectedCategory &&
      description.trim().length > 0 &&
      Number.isFinite(parsed) &&
      parsed > 0
    );
  }, [userId, selectedAccount, selectedCategory, amount, description]);

  const createTransaction = async () => {
    if (!userId || !selectedAccount) return;

    const parsed = parseFloat(amount.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than 0.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing description", "Enter a description.");
      return;
    }
    if (!selectedCategory) return;

    setIsLoading(true);

    try {
      let recurring_rule_id: number | null = null;
      if (isRecurring) {
        let finalNextRunDate = addRuleNextRunDate.trim();
        if (!finalNextRunDate) {
          const fallbackDate = new Date();
          if (recurringFrequency === "Daily") fallbackDate.setDate(fallbackDate.getDate() + 1);
          else if (recurringFrequency === "Weekly") fallbackDate.setDate(fallbackDate.getDate() + 7);
          else if (recurringFrequency === "Monthly") fallbackDate.setMonth(fallbackDate.getMonth() + 1);
          else if (recurringFrequency === "Yearly") fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
          finalNextRunDate = toLocalISOString(fallbackDate);
        }

        const ruleName = description.trim() || `${selectedCategory.category_name} expense`;
        const rule = await createRecurringRule({
          profile_id: userId,
          name: ruleName,
          amount: parsed,
          frequency: recurringFrequency,
          end_date: (isRecurring && hasEndDate && addRuleEndsOn.trim()) ? addRuleEndsOn.trim() : null,
          next_run_date: finalNextRunDate,
          is_active: true,
          account_id: selectedAccount.id,
          expense_categoryid: selectedCategory.id,
          subcategory_id: selectedSubcategory ? selectedSubcategory.id : null,
        });
        recurring_rule_id = rule.id;
      }

      await addExpense({
        profile_id: userId,
        account_id: selectedAccount.id,
        amount: parsed,
        description: description.trim().length ? description.trim() : null,
        expense_categoryid: selectedCategory.id,
        subcategory_id: selectedSubcategory ? selectedSubcategory.id : null,
        transaction_date: transactionDate || toLocalISOString(new Date()),
        recurring_rule_id,
      });

      const latestAccount = await getAccountById({
        id: selectedAccount.id,
        profile_id: userId,
      });
      const balanceSource = latestAccount ?? selectedAccount;
      const currentBalance = balanceSource.balance ?? 0;
      const isCredit = balanceSource.account_type === "credit";
      const nextBalance = isCredit
        ? currentBalance + parsed
        : currentBalance - parsed;

      await updateAccount({
        id: String(selectedAccount.id),
        profile_id: userId,
        update: { balance: nextBalance },
      });

      await onRefresh();
      onClose();
    } catch (error) {
      console.error("Error creating transaction:", error);
      Alert.alert("Could not create transaction", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const createCategory = async () => {
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
      setSelectedCategory(data as CategoryRow);
      await onRefresh();
      // Keep modal open so user can see it's selected
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Could not create category", "Please try again.");
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
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
              await onRefresh();
              if (selectedCategory?.id === categoryId) {
                setSelectedCategory(null);
                setSubcategories([]);
                setSelectedSubcategory(null);
              }
            } catch (error) {
              console.error("Error deleting category:", error);
              Alert.alert("Error", "Could not delete category.");
            }
          },
        },
      ],
    );
  };

  const createSubcategory = async () => {
    if (!userId || !selectedCategory) return;
    const trimmed = newSubcategoryName.trim();
    if (!trimmed) {
      Alert.alert("Subcategory name required", "Enter a name.");
      return;
    }
    try {
      const data = await addSubcategory({
        profile_id: userId,
        category_id: selectedCategory.id,
        category_name: trimmed,
      });
      setNewSubcategoryName("");
      setSelectedSubcategory(data as SubcategoryRow);
      const subs = await listSubcategories({
        profile_id: userId,
        category_id: selectedCategory.id,
      });
      setSubcategories((subs as SubcategoryRow[]) ?? []);
      // Keep modal open so user can see it's selected
    } catch (err) {
      console.error("Error creating subcategory", err);
      Alert.alert("Error", "Could not create subcategory.");
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: number) => {
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
              await deleteSubcategory({ id: subcategoryId, profile_id: userId });
              if (selectedCategory) {
                const subs = await listSubcategories({
                  profile_id: userId,
                  category_id: selectedCategory.id,
                });
                setSubcategories(subs);
              }
              if (selectedSubcategory?.id === subcategoryId) {
                setSelectedSubcategory(null);
              }
            } catch (error) {
              console.error("Error deleting subcategory:", error);
              Alert.alert("Error", "Could not delete subcategory.");
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={{ flex: 1, backgroundColor: ui.surface }}>
        <View style={[styles.modalHeader, { paddingTop: Platform.OS === "ios" ? 20 : (insets.top + 12) }]}>
          <View style={styles.headerSpacer} />
          <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>Add Transaction</ThemedText>
          <View style={styles.headerRight}>
            <Pressable
              onPress={onClose}
              hitSlop={20}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
            >
              <Feather name="x" size={18} color={ui.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          {/* Amount Section */}
          <Pressable
            onPress={() => amountInputRef.current?.focus()}
            style={[styles.amountContainer, { backgroundColor: ui.accentSoft, borderColor: ui.accent + '60' }]}
          >
            <ThemedText style={[styles.currencySymbol, { color: ui.accent }]}>$</ThemedText>
            <TextInput
              ref={amountInputRef}
              value={amount}
              onChangeText={setAmount}
              onBlur={() => {
                if (amount) {
                  const parsed = parseFloat(amount);
                  if (!isNaN(parsed)) {
                    setAmount(parsed.toFixed(2));
                  }
                }
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={ui.accent + "80"}
              style={[styles.amountInput, { color: ui.accent }]}
            />
          </Pressable>

          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>DETAILS</ThemedText>
          </View>

          <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
            <View style={styles.inputRow}>
              <IconSymbol name="signature" size={20} color={ui.mutedText} />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                placeholderTextColor={ui.mutedText}
                style={[styles.rowInput, { color: ui.text }]}
              />
            </View>

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            <DateTimePickerField
              label="Date"
              value={parseLocalDate(transactionDate)}
              onChange={(date) => setTransactionDate(toLocalISOString(date))}
              ui={ui}
              icon="calendar"
            />
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>ACCOUNT & CATEGORY</ThemedText>
          </View>

          <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
            <Pressable onPress={() => setAccountModalOpen(true)} style={styles.inputRow}>
              <IconSymbol name="creditcard" size={20} color={ui.mutedText} />
              <ThemedText style={[styles.rowValue, !selectedAccount && { color: ui.mutedText }]}>
                {selectedAccount?.account_name ?? "Select Account"}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={ui.mutedText} />
            </Pressable>

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            <Pressable onPress={() => setCategoryModalOpen(true)} style={styles.inputRow}>
              <IconSymbol name="tag" size={20} color={ui.mutedText} />
              <ThemedText style={[styles.rowValue, !selectedCategory && { color: ui.mutedText }]}>
                {selectedCategory?.category_name ?? "Select Category"}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={ui.mutedText} />
            </Pressable>

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            <Pressable
              onPress={() => {
                if (!selectedCategory) {
                  Alert.alert("Category required", "Please select a category first.");
                  return;
                }
                setSubcategoryModalOpen(true);
              }}
              style={[styles.inputRow, !selectedCategory && { opacity: 0.5 }]}
            >
              <IconSymbol name="list.bullet" size={20} color={ui.mutedText} />
              <ThemedText style={[styles.rowValue, !selectedSubcategory && { color: ui.mutedText }]}>
                {selectedSubcategory?.category_name ?? (selectedCategory ? "Select Subcategory" : "Category First")}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={ui.mutedText} />
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>RECURRING</ThemedText>
          </View>

          <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
            <View style={styles.inputRow}>
              <IconSymbol name="arrow.2.squarepath" size={20} color={ui.mutedText} />
              <ThemedText style={styles.rowLabel}>Repeat Transaction</ThemedText>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: ui.border, true: "#34C759" }}
              />
            </View>

            {isRecurring && (
              <>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                <Pressable onPress={() => setAddFrequencyModalOpen(true)} style={styles.inputRow}>
                  <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={ui.mutedText} />
                  <ThemedText style={styles.rowLabel}>Frequency</ThemedText>
                  <ThemedText style={{ color: ui.accent }}>{recurringFrequency}</ThemedText>
                  <Feather name="chevron-right" size={16} color={ui.mutedText} style={{ marginLeft: 4 }} />
                </Pressable>

                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                <DateTimePickerField
                  label="Next Run"
                  value={parseLocalDate(addRuleNextRunDate)}
                  onChange={(date) => setAddRuleNextRunDate(toLocalISOString(date))}
                  ui={ui}
                  icon="calendar.badge.clock"
                />

                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                <View style={styles.inputRow}>
                  <IconSymbol name="calendar.badge.minus" size={20} color={ui.mutedText} />
                  <ThemedText style={styles.rowLabel}>Ends</ThemedText>
                  <Switch
                    value={hasEndDate}
                    onValueChange={(val) => {
                      setHasEndDate(val);
                      if (val) {
                        setAddRuleEndsOn(addRuleNextRunDate);
                      } else {
                        setAddRuleEndsOn("");
                      }
                    }}
                    trackColor={{ false: ui.border, true: "#34C759" }}
                  />
                </View>

                {hasEndDate && (
                  <>
                    <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                    <DateTimePickerField
                      label="Ends On"
                      value={parseLocalDate(addRuleEndsOn)}
                      onChange={(date) => setAddRuleEndsOn(toLocalISOString(date))}
                      ui={ui}
                      icon="calendar"
                      placeholder="Select Date"
                    />
                  </>
                )}
              </>
            )}
          </View>

          <Pressable
            onPress={createTransaction}
            disabled={!canCreate || isLoading}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: isDark ? "#FFFFFF" : "#000000",
                borderColor: ui.border,
                marginTop: 32,
                opacity: pressed ? 0.8 : 1,
              },
              (!canCreate || isLoading) && styles.buttonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={isDark ? "#1C1C1E" : "#FFFFFF"} />
            ) : (
              <ThemedText type="defaultSemiBold" style={{ color: isDark ? "#1C1C1E" : "#FFFFFF" }}>
                Add transaction
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>

        {/* Frequency Picker */}
        <SelectionModal
          visible={addFrequencyModalOpen}
          onClose={() => setAddFrequencyModalOpen(false)}
          title="Select Frequency"
          ui={ui}
        >
          {["Daily", "Weekly", "Monthly", "Yearly"].map((freq) => (
            <Pressable
              key={freq}
              style={({ pressed }) => [
                styles.modalOption,
                {
                  borderColor: ui.border,
                  backgroundColor: recurringFrequency === freq ? ui.accentSoft : ui.surface2,
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
              onPress={() => {
                setRecurringFrequency(freq);
                setAddFrequencyModalOpen(false);
              }}
            >
              <ThemedText style={{ color: recurringFrequency === freq ? ui.accent : ui.text }}>{freq}</ThemedText>
              {recurringFrequency === freq && (
                <IconSymbol name="checkmark" size={18} color={ui.accent} />
              )}
            </Pressable>
          ))}
        </SelectionModal>

        {/* Account Picker */}
        <SelectionModal
          visible={accountModalOpen}
          onClose={() => setAccountModalOpen(false)}
          title="Select Account"
          ui={ui}
        >
          {accounts.length === 0 ? (
            <ThemedText style={{ textAlign: "center", padding: 20 }}>{isLoading ? "Loading…" : "No accounts yet."}</ThemedText>
          ) : (
            accounts.map((account) => (
              <Pressable
                key={account.id}
                style={({ pressed }) => [
                  styles.modalOption,
                  {
                    borderColor: ui.border,
                    backgroundColor: selectedAccount?.id === account.id ? ui.accentSoft : ui.surface2,
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
                onPress={() => {
                  setSelectedAccount(account);
                  setAccountModalOpen(false);
                }}
              >
                <View>
                  <ThemedText type="defaultSemiBold" style={{ color: selectedAccount?.id === account.id ? ui.accent : ui.text }}>
                    {account.account_name ?? "Unnamed account"}
                  </ThemedText>
                  <ThemedText type="default" style={{ fontSize: 13, color: selectedAccount?.id === account.id ? ui.accent + 'CC' : ui.mutedText }}>
                    {account.account_type ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) : "—"} {account.currency ?? ""}
                  </ThemedText>
                </View>
                {selectedAccount?.id === account.id && (
                  <IconSymbol name="checkmark" size={18} color={ui.accent} />
                )}
              </Pressable>
            ))
          )}
        </SelectionModal>

        {/* Category Picker */}
        <SelectionModal
          visible={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
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
                style={[styles.footerInput, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]}
              />
              <Pressable
                onPress={createCategory}
                style={({ pressed }) => [
                  styles.footerAddButton,
                  {
                    backgroundColor: ui.accent,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <IconSymbol name="plus" size={24} color={ui.surface} />
              </Pressable>
            </View>
          }
        >
          {categories.length === 0 ? (
            <ThemedText style={{ textAlign: "center", padding: 20 }}>No categories yet.</ThemedText>
          ) : (
            categories.map((cat) => (
              <View
                key={cat.id}
                style={[
                  styles.tag,
                  {
                    borderColor: ui.border,
                    backgroundColor: selectedCategory?.id === cat.id ? ui.accentSoft : ui.surface2,
                  }
                ]}
              >
                <Pressable
                  style={{ paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setCategoryModalOpen(false);
                  }}
                >
                  <ThemedText style={{ color: selectedCategory?.id === cat.id ? ui.accent : ui.text, fontWeight: '500' }}>
                    {cat.category_name ?? "Unnamed"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteCategory(cat.id)}
                  style={{ padding: 8, paddingRight: 10 }}
                >
                  <Feather name="x" size={16} color={ui.mutedText} />
                </Pressable>
              </View>
            ))
          )}
        </SelectionModal>

        {/* Subcategory Picker */}
        <SelectionModal
          visible={subcategoryModalOpen}
          onClose={() => setSubcategoryModalOpen(false)}
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
                style={[styles.footerInput, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]}
              />
              <Pressable
                onPress={createSubcategory}
                style={({ pressed }) => [
                  styles.footerAddButton,
                  {
                    backgroundColor: ui.accent,
                    opacity: pressed ? 0.7 : 1
                  }
                ]}
              >
                <IconSymbol name="plus" size={24} color={ui.surface} />
              </Pressable>
            </View>
          }
        >
          {subcategories.length === 0 ? (
            <ThemedText style={{ textAlign: "center", padding: 20 }}>No subcategories found.</ThemedText>
          ) : (
            subcategories.map((sub) => (
              <View
                key={sub.id}
                style={[
                  styles.tag,
                  {
                    borderColor: ui.border,
                    backgroundColor: selectedSubcategory?.id === sub.id ? ui.accentSoft : ui.surface2,
                  }
                ]}
              >
                <Pressable
                  style={{ paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}
                  onPress={() => {
                    setSelectedSubcategory(sub);
                    setSubcategoryModalOpen(false);
                  }}
                >
                  <ThemedText style={{ color: selectedSubcategory?.id === sub.id ? ui.accent : ui.text, fontWeight: '500' }}>
                    {sub.category_name ?? "Unnamed"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteSubcategory(sub.id)}
                  style={{ padding: 8, paddingRight: 10 }}
                >
                  <Feather name="x" size={16} color={ui.mutedText} />
                </Pressable>
              </View>
            ))
          )}
        </SelectionModal>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 20 : 12, // More space for the drag bar on iOS
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 44,
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: "800",
    marginRight: 4,
    lineHeight: 56,
    paddingVertical: 8,
    includeFontPadding: false,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 56,
    paddingVertical: 8,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.6,
  },
  groupCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  rowValue: {
    flex: 1,
    fontSize: 16,
    textAlign: "right",
    marginRight: 8,
  },
  rowInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  button: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOption: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerInput: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  footerAddButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
