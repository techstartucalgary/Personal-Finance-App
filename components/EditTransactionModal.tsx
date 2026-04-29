import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
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
import { deleteExpense, updateExpense } from "@/utils/expenses";
import {
  extractGoalTransactionGoalId,
  getGoalDeltaFromTransactionAmount,
} from "@/utils/goal-transactions";
import { updateGoalCurrentAmountByDelta } from "@/utils/goals";
import {
  createRecurringRule,
  deleteRecurringRule,
  updateRecurringRule,
} from "@/utils/recurring";

export type ExpenseRow = {
  id: string;
  amount: number | null;
  description?: string | null;
  created_at?: string | null;
  account_id?: number | null;
  expense_categoryid?: number | null;
  subcategory_id?: number | null;
  transaction_date?: string | null;
  recurring_rule_id?: number | null;
};

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

interface EditTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  expense: ExpenseRow | null;
  accounts: AccountRow[];
  categories: CategoryRow[];
  recurringRules: any[];
  onRefresh: () => Promise<void>;
  ui: any;
  isDark: boolean;
  userId: string | undefined;
}

export function EditTransactionModal({
  visible,
  onClose,
  expense,
  accounts,
  categories,
  recurringRules,
  onRefresh,
  ui,
  isDark,
  userId,
}: EditTransactionModalProps) {
  const insets = useSafeAreaInsets();
  const amountInputRef = useRef<TextInput>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTransactionDate, setEditTransactionDate] = useState("");
  const [editSelectedAccount, setEditSelectedAccount] = useState<AccountRow | null>(null);
  const [editSelectedCategory, setEditSelectedCategory] = useState<CategoryRow | null>(null);
  const [editSelectedSubcategory, setEditSelectedSubcategory] = useState<SubcategoryRow | null>(null);
  const [editSubcategories, setEditSubcategories] = useState<SubcategoryRow[]>([]);

  const [editTransactionIsRecurring, setEditTransactionIsRecurring] = useState(false);
  const [editTransactionRecurringFrequency, setEditTransactionRecurringFrequency] = useState("Monthly");
  const [editTransactionHasEndDate, setEditTransactionHasEndDate] = useState(false);
  const [editTransactionRuleEndsOn, setEditTransactionRuleEndsOn] = useState("");
  const [editTransactionRuleNextRunDate, setEditTransactionRuleNextRunDate] = useState("");

  const [editAccountModalOpen, setEditAccountModalOpen] = useState(false);
  const [editCategoryModalOpen, setEditCategoryModalOpen] = useState(false);
  const [editSubcategoryModalOpen, setEditSubcategoryModalOpen] = useState(false);
  const [editFrequencyModalOpen, setEditFrequencyModalOpen] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  // Sync state when expense changes
  useEffect(() => {
    if (expense) {
      setEditAmount(expense.amount != null ? expense.amount.toFixed(2) : "");
      setEditDescription(expense.description ?? "");
      setEditTransactionDate(expense.transaction_date || "");

      const accountMatch = accounts.find((a) => a.id === expense.account_id);
      const categoryMatch = categories.find((c) => c.id === expense.expense_categoryid);
      setEditSelectedAccount(accountMatch ?? null);
      setEditSelectedCategory(categoryMatch ?? null);

      const rule = expense.recurring_rule_id
        ? recurringRules.find((r) => r.id === expense.recurring_rule_id)
        : null;

      if (rule) {
        setEditTransactionIsRecurring(true);
        setEditTransactionRecurringFrequency(rule.frequency || "Monthly");
        setEditTransactionHasEndDate(!!rule.end_date);
        setEditTransactionRuleEndsOn(rule.end_date || "");
        setEditTransactionRuleNextRunDate(rule.next_run_date || "");
      } else {
        setEditTransactionIsRecurring(false);
        setEditTransactionRecurringFrequency("Monthly");
        setEditTransactionHasEndDate(false);
        setEditTransactionRuleEndsOn("");
        setEditTransactionRuleNextRunDate("");
      }

      if (categoryMatch && expense.subcategory_id) {
        listSubcategories({
          profile_id: userId ?? "",
          category_id: categoryMatch.id,
        }).then((subs) => {
          setEditSubcategories((subs as SubcategoryRow[]) ?? []);
          const subMatch = (subs as SubcategoryRow[]).find(
            (s) => s.id === expense.subcategory_id,
          );
          setEditSelectedSubcategory(subMatch ?? null);
        });
      } else {
        setEditSelectedSubcategory(null);
        setEditSubcategories([]);
      }
    }
  }, [expense, accounts, categories, recurringRules, userId]);

  // Load subcategories when category changes
  useEffect(() => {
    if (visible && editSelectedCategory) {
      listSubcategories({
        profile_id: userId ?? "",
        category_id: editSelectedCategory.id,
      }).then((subs) => {
        setEditSubcategories((subs as SubcategoryRow[]) ?? []);
      });
    }
  }, [editSelectedCategory, userId, visible]);

  const applyTransactionToBalance = useCallback(
    (account: AccountRow, transactionAmount: number) => {
      const currentBalance = account.balance ?? 0;
      const isCredit = account.account_type === "credit";
      return isCredit
        ? currentBalance + transactionAmount
        : currentBalance - transactionAmount;
    },
    [],
  );

  const updateTransaction = async () => {
    if (!userId || !expense) return;

    const parsed = parseFloat(editAmount.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than 0.");
      return;
    }

    if (!editSelectedAccount || !editSelectedCategory) {
      Alert.alert("Missing details", "Select an account and category.");
      return;
    }

    setIsLoading(true);

    try {
      let finalRecurringRuleId = expense.recurring_rule_id;

      if (editTransactionIsRecurring && !expense.recurring_rule_id) {
        // Create new rule
        let finalNextRunDate = editTransactionRuleNextRunDate.trim();
        if (!finalNextRunDate) {
          const fallbackDate = new Date();
          if (editTransactionRecurringFrequency === "Daily") fallbackDate.setDate(fallbackDate.getDate() + 1);
          else if (editTransactionRecurringFrequency === "Weekly") fallbackDate.setDate(fallbackDate.getDate() + 7);
          else if (editTransactionRecurringFrequency === "Monthly") fallbackDate.setMonth(fallbackDate.getMonth() + 1);
          else if (editTransactionRecurringFrequency === "Yearly") fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
          finalNextRunDate = toLocalISOString(fallbackDate);
        }

        const ruleName = editDescription.trim() || `${editSelectedCategory.category_name} expense`;
        const rule = await createRecurringRule({
          profile_id: userId,
          name: ruleName,
          amount: parsed,
          frequency: editTransactionRecurringFrequency,
          end_date: (editTransactionIsRecurring && editTransactionHasEndDate && editTransactionRuleEndsOn.trim()) ? editTransactionRuleEndsOn.trim() : null,
          next_run_date: finalNextRunDate,
          is_active: true,
          account_id: editSelectedAccount.id,
          expense_categoryid: editSelectedCategory.id,
          subcategory_id: editSelectedSubcategory ? editSelectedSubcategory.id : null,
        });
        finalRecurringRuleId = rule.id;
      } else if (!editTransactionIsRecurring && expense.recurring_rule_id) {
        // Need to delete the existing rule
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Remove recurring transaction?",
            "This will stop this transaction from recurring. Are you sure?",
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Remove", style: "destructive", onPress: () => resolve(true) },
            ],
          );
        });

        if (!confirmed) {
          setIsLoading(false);
          return;
        }

        await deleteRecurringRule({
          id: expense.recurring_rule_id,
          profile_id: userId,
        });
        finalRecurringRuleId = null;
      } else if (editTransactionIsRecurring && expense.recurring_rule_id) {
        // Update existing rule properties
        await updateRecurringRule({
          id: expense.recurring_rule_id,
          profile_id: userId,
          update: {
            frequency: editTransactionRecurringFrequency as any,
            next_run_date: editTransactionRuleNextRunDate.trim() || undefined,
            end_date: (editTransactionIsRecurring && editTransactionHasEndDate && editTransactionRuleEndsOn.trim()) ? editTransactionRuleEndsOn.trim() : null,
          },
        });
      }

      await updateExpense({
        id: expense.id,
        profile_id: userId,
        update: {
          account_id: editSelectedAccount.id,
          expense_categoryid: editSelectedCategory.id,
          subcategory_id: editSelectedSubcategory ? editSelectedSubcategory.id : null,
          amount: parsed,
          recurring_rule_id: finalRecurringRuleId,
          description: editDescription.trim().length ? editDescription.trim() : null,
          transaction_date: editTransactionDate || undefined,
        },
      });

      const originalAmount = expense.amount ?? 0;
      const originalAccountId = expense.account_id;
      const updatedAccountId = editSelectedAccount.id;
      const linkedGoalId = extractGoalTransactionGoalId(expense.description);

      if (!linkedGoalId && originalAccountId != null && originalAccountId === updatedAccountId) {
        const originalAccount = await getAccountById({
          id: originalAccountId,
          profile_id: userId,
        });
        if (originalAccount) {
          const netAmount = parsed - originalAmount;
          const nextBalance = applyTransactionToBalance(originalAccount, netAmount);
          await updateAccount({
            id: String(originalAccount.id),
            profile_id: userId,
            update: { balance: nextBalance },
          });
        }
      } else {
        if (originalAccountId != null) {
          const originalAccount = await getAccountById({
            id: originalAccountId,
            profile_id: userId,
          });
          if (originalAccount) {
            const revertedBalance = applyTransactionToBalance(originalAccount, -originalAmount);
            await updateAccount({
              id: String(originalAccount.id),
              profile_id: userId,
              update: { balance: revertedBalance },
            });
          }
        }

        const updatedAccount = await getAccountById({
          id: updatedAccountId,
          profile_id: userId,
        });
        if (updatedAccount) {
          const updatedBalance = applyTransactionToBalance(updatedAccount, parsed);
          await updateAccount({
            id: String(updatedAccount.id),
            profile_id: userId,
            update: { balance: updatedBalance },
          });
        }
      }

      await onRefresh();
      onClose();
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Could not update transaction", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTransaction = async () => {
    if (!userId || !expense) return;

    if (expense.recurring_rule_id) {
      Alert.alert(
        "Recurring Transaction",
        "This transaction is part of a recurring series. What would you like to do?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete and Cancel Future Recurring",
            style: "destructive",
            onPress: async () => {
              setIsLoading(true);
              try {
                await deleteRecurringRule({
                  id: expense.recurring_rule_id!,
                  profile_id: userId,
                });
                await executeDelete();
              } catch (error) {
                console.error("Error updating rule:", error);
                Alert.alert("Error", "Could not cancel future recurring transactions.");
                setIsLoading(false);
              }
            },
          },
          {
            text: "Delete This Transaction Only",
            style: "default",
            onPress: async () => {
              setIsLoading(true);
              await executeDelete();
            },
          },
        ],
      );
    } else {
      Alert.alert("Delete transaction?", "This action cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            await executeDelete();
          },
        },
      ]);
    }

    async function executeDelete() {
      if (!userId || !expense) return;
      try {
        const originalAmount = expense.amount ?? 0;
        const originalAccountId = expense.account_id;
        const linkedGoalId = extractGoalTransactionGoalId(expense.description);

        await deleteExpense({ id: expense.id, profile_id: userId });

        if (linkedGoalId) {
          await updateGoalCurrentAmountByDelta({
            id: linkedGoalId,
            profile_id: userId,
            delta: -getGoalDeltaFromTransactionAmount(originalAmount),
          });
        }

        if (!linkedGoalId && originalAccountId != null) {
          const originalAccount = await getAccountById({
            id: originalAccountId,
            profile_id: userId,
          });
          if (originalAccount) {
            const revertedBalance = applyTransactionToBalance(originalAccount, -originalAmount);
            await updateAccount({
              id: String(originalAccount.id),
              profile_id: userId,
              update: { balance: revertedBalance },
            });
          }
        }

        await onRefresh();
        onClose();
      } catch (error) {
        console.error("Error deleting transaction:", error);
        Alert.alert("Error", "Could not delete transaction.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const createEditSubcategory = async () => {
    if (!userId || !editSelectedCategory) return;
    const trimmed = newSubcategoryName.trim();
    if (!trimmed) {
      Alert.alert("Subcategory name required", "Enter a name.");
      return;
    }
    try {
      const data = await addSubcategory({
        profile_id: userId,
        category_id: editSelectedCategory.id,
        category_name: trimmed,
      });
      setNewSubcategoryName("");
      setEditSelectedSubcategory(data as SubcategoryRow);
      // refresh list
      const subs = await listSubcategories({
        profile_id: userId,
        category_id: editSelectedCategory.id,
      });
      setEditSubcategories((subs as SubcategoryRow[]) ?? []);
      // Keep modal open so user can see it's selected
    } catch (err) {
      console.error("Error creating subcategory", err);
      Alert.alert("Error", "Could not create subcategory.");
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: number) => {
    if (!userId || !editSelectedCategory) return;
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
              const subs = await listSubcategories({
                profile_id: userId,
                category_id: editSelectedCategory.id,
              });
              setEditSubcategories(subs);
              if (editSelectedSubcategory?.id === subcategoryId) {
                setEditSelectedSubcategory(null);
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

  const createEditCategory = async () => {
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
      setEditSelectedCategory(data as CategoryRow);
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
              if (editSelectedCategory?.id === categoryId) {
                setEditSelectedCategory(null);
                setEditSubcategories([]);
                setEditSelectedSubcategory(null);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView
        style={{
          flex: 1,
          backgroundColor: ui.surface,
        }}
      >
        <View style={[styles.modalHeader, { paddingTop: Platform.OS === "ios" ? 20 : (insets.top + 12) }]}>
          <View style={styles.headerSpacer} />
          <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>Edit Transaction</ThemedText>
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
              value={editAmount}
              onChangeText={setEditAmount}
              onBlur={() => {
                if (editAmount) {
                  const parsed = parseFloat(editAmount);
                  if (!isNaN(parsed)) {
                    setEditAmount(parsed.toFixed(2));
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
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description"
                placeholderTextColor={ui.mutedText}
                style={[styles.rowInput, { color: ui.text }]}
              />
            </View>
            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
            <DateTimePickerField
              label="Date"
              value={parseLocalDate(editTransactionDate)}
              onChange={(date) => setEditTransactionDate(toLocalISOString(date))}
              ui={ui}
              icon="calendar"
            />
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionHeaderText, { color: ui.mutedText }]}>ACCOUNT & CATEGORY</ThemedText>
          </View>

          <View style={[styles.groupCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
            <Pressable onPress={() => setEditAccountModalOpen(true)} style={styles.inputRow}>
              <IconSymbol name="creditcard" size={20} color={ui.mutedText} />
              <ThemedText style={[styles.rowValue, !editSelectedAccount && { color: ui.mutedText }]}>
                {editSelectedAccount?.account_name ?? "Select Account"}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={ui.mutedText} />
            </Pressable>
            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
            <Pressable onPress={() => setEditCategoryModalOpen(true)} style={styles.inputRow}>
              <IconSymbol name="tag" size={20} color={ui.mutedText} />
              <ThemedText style={[styles.rowValue, !editSelectedCategory && { color: ui.mutedText }]}>
                {editSelectedCategory?.category_name ?? "Select Category"}
              </ThemedText>
              <Feather name="chevron-right" size={16} color={ui.mutedText} />
            </Pressable>
            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
            <Pressable
              onPress={() => {
                if (!editSelectedCategory) {
                  Alert.alert("Category required", "Please select a category first.");
                  return;
                }
                setEditSubcategoryModalOpen(true);
              }}
              style={[styles.inputRow, !editSelectedCategory && { opacity: 0.5 }]}
            >
              <IconSymbol name="list.bullet" size={20} color={ui.mutedText} />
              <ThemedText style={[styles.rowValue, !editSelectedSubcategory && { color: ui.mutedText }]}>
                {editSelectedSubcategory?.category_name ?? (editSelectedCategory ? "Select Subcategory" : "Category First")}
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
                value={editTransactionIsRecurring}
                onValueChange={setEditTransactionIsRecurring}
                trackColor={{ false: ui.border, true: "#34C759" }}
              />
            </View>
            {editTransactionIsRecurring && (
              <>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                <Pressable onPress={() => setEditFrequencyModalOpen(true)} style={styles.inputRow}>
                  <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={ui.mutedText} />
                  <ThemedText style={styles.rowLabel}>Frequency</ThemedText>
                  <ThemedText style={{ color: ui.accent }}>{editTransactionRecurringFrequency}</ThemedText>
                  <Feather name="chevron-right" size={16} color={ui.mutedText} style={{ marginLeft: 4 }} />
                </Pressable>
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                <DateTimePickerField
                  label="Next Run"
                  value={parseLocalDate(editTransactionRuleNextRunDate)}
                  onChange={(date) => setEditTransactionRuleNextRunDate(toLocalISOString(date))}
                  ui={ui}
                  icon="calendar.badge.clock"
                />
                <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                <View style={styles.inputRow}>
                  <IconSymbol name="calendar.badge.minus" size={20} color={ui.mutedText} />
                  <ThemedText style={styles.rowLabel}>Ends</ThemedText>
                  <Switch
                    value={editTransactionHasEndDate}
                    onValueChange={(val) => {
                      setEditTransactionHasEndDate(val);
                      if (val) {
                        setEditTransactionRuleEndsOn(editTransactionRuleNextRunDate);
                      } else {
                        setEditTransactionRuleEndsOn("");
                      }
                    }}
                    trackColor={{ false: ui.border, true: "#34C759" }}
                  />
                </View>

                {editTransactionHasEndDate && (
                  <>
                    <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />
                    <DateTimePickerField
                      label="Ends On"
                      value={parseLocalDate(editTransactionRuleEndsOn)}
                      onChange={(date) => setEditTransactionRuleEndsOn(toLocalISOString(date))}
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
            onPress={updateTransaction}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: isDark ? "#FFFFFF" : "#000000",
                borderColor: ui.border,
                marginTop: 32,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isDark ? "#1C1C1E" : "#FFFFFF"} />
            ) : (
              <ThemedText type="defaultSemiBold" style={{ color: isDark ? "#1C1C1E" : "#FFFFFF" }}>
                Save Transaction
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={deleteTransaction}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                borderColor: ui.border,
                backgroundColor: ui.surface3,
                marginTop: 12,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: ui.danger }}>
              Delete Transaction
            </ThemedText>
          </Pressable>
        </ScrollView>

        {/* Frequency Picker */}
        <SelectionModal
          visible={editFrequencyModalOpen}
          onClose={() => setEditFrequencyModalOpen(false)}
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
                  backgroundColor: editTransactionRecurringFrequency === freq ? ui.accentSoft : ui.surface2,
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
              onPress={() => {
                setEditTransactionRecurringFrequency(freq);

                // Automatically calculate next run date
                const baseDate = editTransactionDate ? parseLocalDate(editTransactionDate) : new Date();
                const nextDate = new Date(baseDate);

                if (freq === "Daily") nextDate.setDate(nextDate.getDate() + 1);
                else if (freq === "Weekly") nextDate.setDate(nextDate.getDate() + 7);
                else if (freq === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
                else if (freq === "Yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);

                setEditTransactionRuleNextRunDate(toLocalISOString(nextDate));
                setEditFrequencyModalOpen(false);
              }}
            >
              <ThemedText style={{ color: editTransactionRecurringFrequency === freq ? ui.accent : ui.text }}>{freq}</ThemedText>
              {editTransactionRecurringFrequency === freq && (
                <IconSymbol name="checkmark" size={18} color={ui.accent} />
              )}
            </Pressable>
          ))}
        </SelectionModal>

        {/* Subcategory Picker */}
        <SelectionModal
          visible={editSubcategoryModalOpen}
          onClose={() => setEditSubcategoryModalOpen(false)}
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
                onPress={createEditSubcategory}
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
          {editSubcategories.length === 0 ? (
            <ThemedText style={{ textAlign: "center", padding: 20 }}>No subcategories found.</ThemedText>
          ) : (
            editSubcategories.map((sub) => (
              <View
                key={sub.id}
                style={[
                  styles.tag,
                  {
                    borderColor: ui.border,
                    backgroundColor: editSelectedSubcategory?.id === sub.id ? ui.accentSoft : ui.surface2,
                  }
                ]}
              >
                <Pressable
                  style={{ paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}
                  onPress={() => {
                    setEditSelectedSubcategory(sub);
                    setEditSubcategoryModalOpen(false);
                  }}
                >
                  <ThemedText style={{ color: editSelectedSubcategory?.id === sub.id ? ui.accent : ui.text, fontWeight: '500' }}>
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

        {/* Account Picker */}
        <SelectionModal
          visible={editAccountModalOpen}
          onClose={() => setEditAccountModalOpen(false)}
          title="Select Account"
          ui={ui}
        >
          {accounts.length === 0 ? (
            <ThemedText>{isLoading ? "Loading…" : "No accounts yet."}</ThemedText>
          ) : (
            accounts.map((account) => (
              <Pressable
                key={account.id}
                style={({ pressed }) => [
                  styles.modalOption,
                  {
                    borderColor: ui.border,
                    backgroundColor: editSelectedAccount?.id === account.id ? ui.accentSoft : ui.surface2,
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
                onPress={() => {
                  setEditSelectedAccount(account);
                  setEditAccountModalOpen(false);
                }}
              >
                <View>
                  <ThemedText type="defaultSemiBold" style={{ color: editSelectedAccount?.id === account.id ? ui.accent : ui.text }}>
                    {account.account_name ?? "Unnamed account"}
                  </ThemedText>
                  <ThemedText type="default" style={{ fontSize: 13, color: editSelectedAccount?.id === account.id ? ui.accent + 'CC' : ui.mutedText }}>
                    {account.account_type ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) : "—"} {account.currency ?? ""}
                  </ThemedText>
                </View>
                {editSelectedAccount?.id === account.id && (
                  <IconSymbol name="checkmark" size={18} color={ui.accent} />
                )}
              </Pressable>
            ))
          )}
        </SelectionModal>

        {/* Category Picker */}
        <SelectionModal
          visible={editCategoryModalOpen}
          onClose={() => setEditCategoryModalOpen(false)}
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
                onPress={createEditCategory}
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
                    backgroundColor: editSelectedCategory?.id === cat.id ? ui.accentSoft : ui.surface2,
                  }
                ]}
              >
                <Pressable
                  style={{ paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}
                  onPress={() => {
                    setEditSelectedCategory(cat);
                    setEditCategoryModalOpen(false);
                  }}
                >
                  <ThemedText style={{ color: editSelectedCategory?.id === cat.id ? ui.accent : ui.text, fontWeight: '500' }}>
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
  headerButton: {
    paddingHorizontal: 8,
    minWidth: 60,
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
  saveButton: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteButton: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
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
