import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useState } from "react";
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
import { deleteExpense, updateExpense } from "@/utils/expenses";
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
      setEditAmount(expense.amount?.toString() ?? "");
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
        setEditTransactionRuleEndsOn(rule.end_date || "");
        setEditTransactionRuleNextRunDate(rule.next_run_date || "");
      } else {
        setEditTransactionIsRecurring(false);
        setEditTransactionRecurringFrequency("Monthly");
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
          end_date: editTransactionRuleEndsOn.trim() ? editTransactionRuleEndsOn.trim() : null,
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
            end_date: editTransactionRuleEndsOn.trim() ? editTransactionRuleEndsOn.trim() : null,
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

      if (originalAccountId != null && originalAccountId === updatedAccountId) {
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

        await deleteExpense({ id: expense.id, profile_id: userId });

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
      setEditSubcategoryModalOpen(false);
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
      setEditCategoryModalOpen(false);
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
          padding: 16,
          paddingTop: Platform.OS === "ios" ? 12 : (16 + insets.top),
          paddingBottom: 16 + insets.bottom,
        }}
      >
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft} />
          <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>Edit Transaction</ThemedText>
          <View style={styles.modalHeaderRight}>
            <Pressable
              onPress={onClose}
              hitSlop={20}
              style={[styles.modalCloseButton, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)" }]}
            >
              <Feather name="x" size={18} color={ui.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Account</ThemedText>
            <Pressable
              onPress={() => setEditAccountModalOpen(true)}
              style={[
                styles.dropdownButton,
                { borderColor: ui.border, backgroundColor: ui.surface2 },
              ]}
            >
              <ThemedText>
                {editSelectedAccount?.account_name ?? "Select an account"}
              </ThemedText>
            </Pressable>
          </View>

          <DateTimePickerField
            label="Transaction Date"
            value={parseLocalDate(editTransactionDate)}
            onChange={(date) => setEditTransactionDate(toLocalISOString(date))}
            ui={ui}
          />

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Category</ThemedText>
            <Pressable
              onPress={() => setEditCategoryModalOpen(true)}
              style={[
                styles.dropdownButton,
                { borderColor: ui.border, backgroundColor: ui.surface2 },
              ]}
            >
              <ThemedText>
                {editSelectedCategory?.category_name ?? "Select a category"}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Subcategory</ThemedText>
            <Pressable
              onPress={() => {
                if (!editSelectedCategory) {
                  Alert.alert("Category required", "Please select a category first.");
                  return;
                }
                setEditSubcategoryModalOpen(true);
              }}
              style={[
                styles.dropdownButton,
                { borderColor: ui.border, backgroundColor: ui.surface2 },
                !editSelectedCategory && { opacity: 0.5 },
              ]}
            >
              <ThemedText style={!editSelectedCategory ? { color: ui.mutedText } : undefined}>
                {editSelectedSubcategory?.category_name ?? (editSelectedCategory ? "Select subcategory" : "Select category first")}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Amount</ThemedText>
            <TextInput
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={ui.mutedText}
              style={[
                styles.input,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface2,
                  color: ui.text,
                },
              ]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Description</ThemedText>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="e.g. Grocery run"
              placeholderTextColor={ui.mutedText}
              style={[
                styles.input,
                {
                  borderColor: ui.border,
                  backgroundColor: ui.surface2,
                  color: ui.text,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.fieldGroup,
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
            ]}
          >
            <ThemedText type="defaultSemiBold">Make Recurring</ThemedText>
            <Switch
              value={editTransactionIsRecurring}
              onValueChange={setEditTransactionIsRecurring}
              trackColor={{ false: ui.border, true: "#34C759" }}
            />
          </View>

          {editTransactionIsRecurring && (
            <View style={styles.fieldGroup}>
              <ThemedText type="defaultSemiBold">Frequency</ThemedText>
              <Pressable
                onPress={() => setEditFrequencyModalOpen(true)}
                style={[
                  styles.dropdownButton,
                  { borderColor: ui.border, backgroundColor: ui.surface2 },
                ]}
              >
                <ThemedText>{editTransactionRecurringFrequency}</ThemedText>
              </Pressable>
            </View>
          )}

          {editTransactionIsRecurring && (
            <DateTimePickerField
              label="Next Run Date"
              value={parseLocalDate(editTransactionRuleNextRunDate)}
              onChange={(date) => setEditTransactionRuleNextRunDate(toLocalISOString(date))}
              ui={ui}
            />
          )}

          {editTransactionIsRecurring && (
            <DateTimePickerField
              label="Ends On (Optional)"
              value={parseLocalDate(editTransactionRuleEndsOn)}
              onChange={(date) => setEditTransactionRuleEndsOn(toLocalISOString(date))}
              ui={ui}
            />
          )}

          <Pressable
            onPress={updateTransaction}
            disabled={isLoading}
            style={[
              styles.button,
              {
                backgroundColor: ui.text,
                borderColor: ui.border,
                alignSelf: "center",
                width: "100%",
                alignItems: "center",
                paddingVertical: 12,
                borderRadius: 24,
                marginTop: 16,
              },
              isLoading && styles.buttonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={ui.surface} />
            ) : (
              <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
                Save changes
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={deleteTransaction}
            disabled={isLoading}
            style={[
              styles.deleteAction,
              { borderColor: ui.border, backgroundColor: ui.surface2 },
              isLoading && styles.buttonDisabled,
            ]}
          >
            <ThemedText style={{ color: ui.danger, fontWeight: "600" }}>
              Delete transaction
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
              style={[styles.modalOption, { borderColor: ui.border, backgroundColor: ui.surface }]}
              onPress={() => {
                setEditTransactionRecurringFrequency(freq);
                setEditFrequencyModalOpen(false);
              }}
            >
              <ThemedText>{freq}</ThemedText>
            </Pressable>
          ))}
        </SelectionModal>

        {/* Subcategory Picker */}
        <SelectionModal
          visible={editSubcategoryModalOpen}
          onClose={() => setEditSubcategoryModalOpen(false)}
          title="Select Subcategory"
          ui={ui}
          footer={
            <View style={styles.fieldGroup}>
              <TextInput
                value={newSubcategoryName}
                onChangeText={setNewSubcategoryName}
                placeholder="New subcategory name"
                placeholderTextColor={ui.mutedText}
                style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface, color: ui.text }]}
              />
              <Pressable onPress={createEditSubcategory} style={[styles.button, { borderColor: ui.border, backgroundColor: ui.surface }]}>
                <ThemedText type="defaultSemiBold">Add subcategory</ThemedText>
              </Pressable>
            </View>
          }
        >
          {editSubcategories.length === 0 ? (
            <ThemedText style={{ textAlign: "center", padding: 20 }}>No subcategories found.</ThemedText>
          ) : (
            editSubcategories.map((sub) => (
              <View key={sub.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  style={[styles.modalOption, { borderColor: ui.border, backgroundColor: ui.surface, flex: 1 }]}
                  onPress={() => {
                    setEditSelectedSubcategory(sub);
                    setEditSubcategoryModalOpen(false);
                  }}
                >
                  <ThemedText>{sub.category_name ?? "Unnamed subcategory"}</ThemedText>
                </Pressable>
                <Pressable onPress={() => handleDeleteSubcategory(sub.id)} style={{ padding: 8 }}>
                  <IconSymbol name="trash" size={20} color="#FF3B30" />
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
                style={[styles.modalOption, { borderColor: ui.border, backgroundColor: ui.surface }]}
                onPress={() => {
                  setEditSelectedAccount(account);
                  setEditAccountModalOpen(false);
                }}
              >
                <View>
                  <ThemedText type="defaultSemiBold">{account.account_name ?? "Unnamed account"}</ThemedText>
                  <ThemedText type="default" style={{ fontSize: 13, color: ui.mutedText }}>
                    {account.account_type ? account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1) : "—"} {account.currency ?? ""}
                  </ThemedText>
                </View>
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
          footer={
            <View style={styles.fieldGroup}>
              <TextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="New category name"
                placeholderTextColor={ui.mutedText}
                style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface, color: ui.text }]}
              />
              <Pressable onPress={createEditCategory} style={[styles.button, { borderColor: ui.border, backgroundColor: ui.surface }]}>
                <ThemedText type="defaultSemiBold">Add category</ThemedText>
              </Pressable>
            </View>
          }
        >
          {categories.length === 0 ? (
            <ThemedText style={{ textAlign: "center", padding: 20 }}>No categories yet.</ThemedText>
          ) : (
            categories.map((cat) => (
              <View key={cat.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  style={[styles.modalOption, { borderColor: ui.border, backgroundColor: ui.surface, flex: 1 }]}
                  onPress={() => {
                    setEditSelectedCategory(cat);
                    setEditCategoryModalOpen(false);
                  }}
                >
                  <ThemedText>{cat.category_name ?? "Unnamed category"}</ThemedText>
                </Pressable>
                <Pressable onPress={() => handleDeleteCategory(cat.id)} style={{ padding: 8 }}>
                  <IconSymbol name="trash" size={20} color="#FF3B30" />
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
    paddingVertical: 12,
    marginBottom: 8,
  },
  modalHeaderTitle: {
    fontSize: 17,
    flex: 1,
    textAlign: "center",
  },
  modalHeaderLeft: { width: 44 },
  modalHeaderRight: { width: 44, alignItems: "flex-end" },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  input: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  button: {
    padding: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteAction: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
  },
  modalBackdrop: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "80%",
  },
  modalOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalCancel: {
    marginTop: 4,
    justifyContent: "center",
  },
  fieldGroup: {
    gap: 6,
  },
});
