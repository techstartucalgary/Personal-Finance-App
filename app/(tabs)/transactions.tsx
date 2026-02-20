import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  useColorScheme,
  View
} from "react-native";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { getAccountById, listAccounts, updateAccount } from "@/utils/accounts";
import {
  addCategory,
  addSubcategory,
  deleteCategory,
  deleteSubcategory,
  listCategories,
  listSubcategories,
} from "@/utils/categories";
import {
  addExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "@/utils/expenses";
import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRules,
  updateRecurringRule
} from "@/utils/recurring";

import { useFocusEffect, useRouter } from "expo-router";

export default function HomeScreen() {
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Dynamic tab bar height
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = insets.bottom + 60;
  }
  const fabBottom = tabBarHeight + 60;
  const ui = useMemo(
    () => ({
      surface: isDark ? "#121212" : "#ffffff",
      surface2: isDark ? "#1a1a1a" : "#ffffff",
      border: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
      text: isDark ? "#ffffff" : "#111111",
      mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
      backdrop: "rgba(0,0,0,0.45)",
    }),
    [isDark],
  );

  const userId = session?.user.id;

  type AccountRow = {
    id: number;
    account_name: string | null;
    account_type: string | null;
    balance: number | null;
    currency: string | null;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(
    null,
  );
  const [editAccountModalOpen, setEditAccountModalOpen] = useState(false);
  const [editSelectedAccount, setEditSelectedAccount] =
    useState<AccountRow | null>(null);
  type CategoryRow = {
    id: number;
    category_name: string | null;
  };

  type SubcategoryRow = {
    id: number;
    category_name: string | null;
    expense_categoryid: number | null;
  };

  type ExpenseRow = {
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

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(
    null,
  );

  // subcategory state
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<SubcategoryRow | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const [editCategoryModalOpen, setEditCategoryModalOpen] = useState(false);
  const [editSelectedCategory, setEditSelectedCategory] =
    useState<CategoryRow | null>(null);

  // edit subcategory state
  const [editSubcategories, setEditSubcategories] = useState<SubcategoryRow[]>(
    [],
  );
  const [editSubcategoryModalOpen, setEditSubcategoryModalOpen] =
    useState(false);
  const [editSelectedSubcategory, setEditSelectedSubcategory] =
    useState<SubcategoryRow | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("Monthly");
  const [frequencyModalOpen, setFrequencyModalOpen] = useState(false);
  const [isAddEndsOnEnabled, setIsAddEndsOnEnabled] = useState(false);
  const [addRuleEndsOn, setAddRuleEndsOn] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  // Tabs and Rules State
  const [activeTab, setActiveTab] = useState<"transactions" | "subscriptions">("transactions");
  const [recurringRules, setRecurringRules] = useState<any[]>([]); // Adjust type to RecurringExpenseRule if you import it
  const [editingRule, setEditingRule] = useState<any | null>(null);

  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTransactionIsRecurring, setEditTransactionIsRecurring] = useState(false);
  const [editTransactionRecurringFrequency, setEditTransactionRecurringFrequency] = useState("Monthly");
  const [editTransactionRuleEndsOn, setEditTransactionRuleEndsOn] = useState("");

  // Edit Subscription State
  const [editRuleName, setEditRuleName] = useState("");
  const [editRuleAmount, setEditRuleAmount] = useState("");
  const [editRuleFrequency, setEditRuleFrequency] = useState("Monthly");
  const [isEditEndsOnEnabled, setIsEditEndsOnEnabled] = useState(false);
  const [editRuleEndsOn, setEditRuleEndsOn] = useState("");
  const [editRuleSelectedCategory, setEditRuleSelectedCategory] = useState<CategoryRow | null>(null);
  const [editRuleSelectedSubcategory, setEditRuleSelectedSubcategory] = useState<SubcategoryRow | null>(null);
  const [editRuleFrequencyModalOpen, setEditRuleFrequencyModalOpen] = useState(false);
  const [editRuleCategoryModalOpen, setEditRuleCategoryModalOpen] = useState(false);
  const [editRuleSubcategoryModalOpen, setEditRuleSubcategoryModalOpen] = useState(false);
  const [editRuleSubcategories, setEditRuleSubcategories] = useState<SubcategoryRow[]>([]);

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
  }, []);

  const formatMoney = useCallback((value?: number | null) => {
    if (value == null) return "0.00";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(value);
  }, []);

  const loadAccounts = useCallback(
    async (silent = false) => {
      if (!userId) {
        setAccounts([]);
        return;
      }

      if (!silent) setIsLoading(true);
      try {
        const data = await listAccounts({ profile_id: userId });
        setAccounts((data as AccountRow[]) ?? []);
      } catch (error) {
        console.error("Error loading accounts:", error);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [userId],
  );

  const loadCategories = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      return;
    }

    try {
      const data = await listCategories({ profile_id: userId });
      setCategories((data as CategoryRow[]) ?? []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Load subcategories when selectedCategory changes in Add Modal
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
        setSelectedSubcategory(null); // reset subcategory when category changes
      } catch (error) {
        console.error("Error loading subcategories:", error);
      }
    };
    fetchSub();
  }, [userId, selectedCategory]);

  // Load subcategories when editSelectedCategory changes in Edit Modal
  useEffect(() => {
    const fetchSub = async () => {
      if (!userId || !editSelectedCategory) {
        setEditSubcategories([]);
        setEditSelectedSubcategory(null);
        return;
      }
      try {
        const data = await listSubcategories({
          profile_id: userId,
          category_id: editSelectedCategory.id,
        });
        setEditSubcategories((data as SubcategoryRow[]) ?? []);
        // Don't auto-reset editSelectedSubcategory here because we might be
        // setting it from the editingExpense data
      } catch (error) {
        console.error("Error loading edit subcategories:", error);
      }
    };
    fetchSub();
  }, [userId, editSelectedCategory]);

  const loadExpenses = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      return;
    }

    try {
      const data = await listExpenses({ profile_id: userId });
      setExpenses((data as ExpenseRow[]) ?? []);
    } catch (error) {
      console.error("Error loading expenses:", error);
    }
  }, [userId]);

  const loadRecurringRules = useCallback(async () => {
    if (!userId) {
      setRecurringRules([]);
      return;
    }
    try {
      const data = await getRecurringRules({ profile_id: userId });
      setRecurringRules(data ?? []);
    } catch (error) {
      console.error("Error loading recurring rules:", error);
    }
  }, [userId]);

  useEffect(() => {
    loadExpenses();
    loadRecurringRules();
  }, [loadExpenses, loadRecurringRules]);

  useEffect(() => {
    if (editingExpense) {
      setEditAmount(editingExpense.amount?.toString() ?? "");
      setEditDescription(editingExpense.description ?? "");

      const rule = editingExpense.recurring_rule_id ? recurringRules.find((r) => r.id === editingExpense.recurring_rule_id) : null;
      if (rule) {
        setEditTransactionIsRecurring(true);
        setEditTransactionRecurringFrequency(rule.frequency || "Monthly");
        setEditTransactionRuleEndsOn(rule.end_date || "");
      } else {
        setEditTransactionIsRecurring(false);
        setEditTransactionRecurringFrequency("Monthly");
        setEditTransactionRuleEndsOn("");
      }
    }
  }, [editingExpense, recurringRules]);

  useEffect(() => {
    // Populate initial edit state from expense
    if (!editingExpense) return;
    const accountMatch = accounts.find(
      (account) => account.id === editingExpense.account_id,
    );
    const categoryMatch = categories.find(
      (category) => category.id === editingExpense.expense_categoryid,
    );
    setEditSelectedAccount(accountMatch ?? null);
    setEditSelectedCategory(categoryMatch ?? null);

    // wait for categories to load
    if (categoryMatch && editingExpense.subcategory_id) {
      // fetch subcategories for this category to find the match
      listSubcategories({
        profile_id: session?.user.id ?? "",
        category_id: categoryMatch.id,
      }).then((subs) => {
        setEditSubcategories((subs as SubcategoryRow[]) ?? []);
        const subMatch = (subs as SubcategoryRow[]).find(
          (s) => s.id === editingExpense.subcategory_id,
        );
        setEditSelectedSubcategory(subMatch ?? null);
      });
    } else {
      setEditSelectedSubcategory(null);
    }
  }, [editingExpense, accounts, categories, session]);

  useEffect(() => {
    if (!editingRule) return;
    setEditRuleName(editingRule.name || "");
    setEditRuleAmount(editingRule.amount?.toString() || "");
    setEditRuleFrequency(editingRule.frequency || "Monthly");
    setIsEditEndsOnEnabled(!!editingRule.end_date);
    setEditRuleEndsOn(editingRule.end_date || "");

    const categoryMatch = categories.find((c) => c.id === editingRule.expense_categoryid);
    setEditRuleSelectedCategory(categoryMatch ?? null);

    if (categoryMatch && editingRule.subcategory_id) {
      listSubcategories({
        profile_id: session?.user.id ?? "",
        category_id: categoryMatch.id,
      }).then((subs) => {
        setEditRuleSubcategories((subs as SubcategoryRow[]) ?? []);
        const subMatch = (subs as SubcategoryRow[]).find((s) => s.id === editingRule.subcategory_id);
        setEditRuleSelectedSubcategory(subMatch ?? null);
      });
    } else {
      setEditRuleSelectedSubcategory(null);
    }
  }, [editingRule, categories, session]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts(true);
      loadCategories();
      loadExpenses();
      loadRecurringRules();
    }, [loadAccounts, loadCategories, loadExpenses, loadRecurringRules]),
  );

  const createSubcategory = useCallback(async () => {
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
      // refresh list
      const subs = await listSubcategories({
        profile_id: userId,
        category_id: selectedCategory.id,
      });
      setSubcategories((subs as SubcategoryRow[]) ?? []);
      setSubcategoryModalOpen(false);
    } catch (err) {
      console.error("Error creating subcategory", err);
      Alert.alert("Error", "Could not create subcategory.");
    }
  }, [userId, selectedCategory, newSubcategoryName]);

  const createEditSubcategory = useCallback(async () => {
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
  }, [userId, editSelectedCategory, newSubcategoryName]);

  const createCategory = useCallback(async () => {
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
      await loadCategories();
      setCategoryModalOpen(false);
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Could not create category", "Please try again.");
    }
  }, [userId, newCategoryName, loadCategories]);

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
      setEditSelectedCategory(data as CategoryRow);
      await loadCategories();
      setEditCategoryModalOpen(false);
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Could not create category", "Please try again.");
    }
  }, [userId, newCategoryName, loadCategories]);

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
                await loadCategories();
                // If the deleted category was selected, clear it
                if (selectedCategory?.id === categoryId) {
                  setSelectedCategory(null);
                  setSubcategories([]);
                  setSelectedSubcategory(null);
                }
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
    },
    [userId, loadCategories, selectedCategory, editSelectedCategory],
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
                // refresh subcategories list for current selection
                if (selectedCategory) {
                  const subs = await listSubcategories({
                    profile_id: userId,
                    category_id: selectedCategory.id,
                  });
                  setSubcategories(subs);
                }
                if (editSelectedCategory) {
                  const editSubs = await listSubcategories({
                    profile_id: userId,
                    category_id: editSelectedCategory.id,
                  });
                  setEditSubcategories(editSubs);
                }

                // If deleted subcategory was selected, clear it
                if (selectedSubcategory?.id === subcategoryId) {
                  setSelectedSubcategory(null);
                }
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
    },
    [
      userId,
      selectedCategory,
      editSelectedCategory,
      selectedSubcategory,
      editSelectedSubcategory,
    ],
  );

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

  const createTransaction = useCallback(async () => {
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
        const nextDate = new Date();
        if (recurringFrequency === "Daily") nextDate.setDate(nextDate.getDate() + 1);
        else if (recurringFrequency === "Weekly") nextDate.setDate(nextDate.getDate() + 7);
        else if (recurringFrequency === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
        else if (recurringFrequency === "Yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);

        const ruleName = description.trim() || `${selectedCategory.category_name} expense`;
        const rule = await createRecurringRule({
          profile_id: userId,
          name: ruleName,
          amount: parsed,
          frequency: recurringFrequency,
          end_date: addRuleEndsOn.trim() ? addRuleEndsOn.trim() : null,
          next_run_date: nextDate.toISOString().split("T")[0],
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
        transaction_date: new Date().toISOString(),
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

      setAmount("");
      setDescription("");
      setSelectedSubcategory(null);
      setIsRecurring(false);
      setRecurringFrequency("Monthly");
      setAddRuleEndsOn("");
      setAddModalOpen(false);
      await loadExpenses();
      await loadAccounts();
    } catch (error) {
      console.error("Error creating transaction:", error);
      Alert.alert("Could not create transaction", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    selectedAccount,
    amount,
    selectedSubcategory,
    selectedCategory,
    description,
    isRecurring,
    recurringFrequency,
    loadExpenses,
    loadAccounts,
  ]);

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

  const updateTransaction = useCallback(async () => {
    if (!userId || !editingExpense) return;

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
      let finalRecurringRuleId = editingExpense.recurring_rule_id;

      if (editTransactionIsRecurring && !editingExpense.recurring_rule_id) {
        // Create new rule
        const nextDate = new Date();
        if (editTransactionRecurringFrequency === "Daily") nextDate.setDate(nextDate.getDate() + 1);
        else if (editTransactionRecurringFrequency === "Weekly") nextDate.setDate(nextDate.getDate() + 7);
        else if (editTransactionRecurringFrequency === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
        else if (editTransactionRecurringFrequency === "Yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);

        const ruleName = editDescription.trim() || `${editSelectedCategory.category_name} expense`;
        const rule = await createRecurringRule({
          profile_id: userId,
          name: ruleName,
          amount: parsed,
          frequency: editTransactionRecurringFrequency,
          end_date: editTransactionRuleEndsOn.trim() ? editTransactionRuleEndsOn.trim() : null,
          next_run_date: nextDate.toISOString().split("T")[0],
          is_active: true,
          account_id: editSelectedAccount.id,
          expense_categoryid: editSelectedCategory.id,
          subcategory_id: editSelectedSubcategory ? editSelectedSubcategory.id : null,
        });
        finalRecurringRuleId = rule.id;
      } else if (!editTransactionIsRecurring && editingExpense.recurring_rule_id) {
        // Need to delete the existing rule
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Remove Recurring?",
            "This will cancel all future transactions for this subscription. Are you sure?",
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Remove", style: "destructive", onPress: () => resolve(true) }
            ]
          );
        });

        if (!confirmed) {
          setIsLoading(false);
          return;
        }

        await deleteRecurringRule({
          id: editingExpense.recurring_rule_id,
          profile_id: userId,
        });
        finalRecurringRuleId = null;
      }

      await updateExpense({
        id: editingExpense.id,
        profile_id: userId,
        update: {
          account_id: editSelectedAccount.id,
          expense_categoryid: editSelectedCategory.id,
          subcategory_id: editSelectedSubcategory
            ? editSelectedSubcategory.id
            : null,
          amount: parsed,
          recurring_rule_id: finalRecurringRuleId,
          description: editDescription.trim().length
            ? editDescription.trim()
            : null,
        },
      });

      const originalAmount = editingExpense.amount ?? 0;
      const originalAccountId = editingExpense.account_id;
      const updatedAccountId = editSelectedAccount.id;

      if (originalAccountId != null && originalAccountId === updatedAccountId) {
        const originalAccount = await getAccountById({
          id: originalAccountId,
          profile_id: userId,
        });
        if (originalAccount) {
          const netAmount = parsed - originalAmount;
          const nextBalance = applyTransactionToBalance(
            originalAccount,
            netAmount,
          );
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
            const revertedBalance = applyTransactionToBalance(
              originalAccount,
              -originalAmount,
            );
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
          const updatedBalance = applyTransactionToBalance(
            updatedAccount,
            parsed,
          );
          await updateAccount({
            id: String(updatedAccount.id),
            profile_id: userId,
            update: { balance: updatedBalance },
          });
        }
      }

      setEditingExpense(null);
      await loadExpenses();
      await loadAccounts();
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Could not update transaction", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    editingExpense,
    editAmount,
    editDescription,
    editSelectedAccount,
    editSelectedCategory,
    editSelectedSubcategory,
    editTransactionIsRecurring,
    editTransactionRecurringFrequency,
    editTransactionRuleEndsOn,
    applyTransactionToBalance,
    loadExpenses,
    loadAccounts,
  ]);

  const deleteTransaction = useCallback(async () => {
    if (!userId || !editingExpense) return;

    if (editingExpense.recurring_rule_id) {
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
                  id: editingExpense.recurring_rule_id!,
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
      if (!userId) return;
      try {
        const originalAmount = editingExpense?.amount ?? 0;
        const originalAccountId = editingExpense?.account_id;

        if (editingExpense) {
          await deleteExpense({
            id: editingExpense.id,
            profile_id: userId,
          });
        }

        if (originalAccountId != null) {
          const originalAccount = await getAccountById({
            id: originalAccountId,
            profile_id: userId,
          });
          if (originalAccount) {
            const revertedBalance = applyTransactionToBalance(
              originalAccount,
              -originalAmount,
            );
            await updateAccount({
              id: String(originalAccount.id),
              profile_id: userId,
              update: { balance: revertedBalance },
            });
          }
        }

        setEditingExpense(null);
        await loadExpenses();
        await loadAccounts();
      } catch (error) {
        console.error("Error deleting transaction:", error);
        Alert.alert("Could not delete transaction", "Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [
    userId,
    editingExpense,
    applyTransactionToBalance,
    loadExpenses,
    loadAccounts,
  ]);

  const handleDeleteRule = useCallback((ruleId: number) => {
    if (!userId) return;

    Alert.alert("Delete Subscription?", "This action will permanently delete this recurring rule.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          try {
            await deleteRecurringRule({ id: ruleId, profile_id: userId });
            await loadRecurringRules();
          } catch (error) {
            console.error("Error deleting rule:", error);
            Alert.alert("Error", "Could not delete this subscription.");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  }, [userId, loadRecurringRules]);

  const handleToggleRuleStatus = useCallback(async (rule: any) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      await updateRecurringRule({
        id: rule.id,
        profile_id: userId,
        update: { is_active: !rule.is_active }
      });
      await loadRecurringRules();
    } catch (error) {
      console.error("Error toggling rule:", error);
      Alert.alert("Error", "Could not update rule status.");
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadRecurringRules]);

  const handleSaveRuleEdit = useCallback(async () => {
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
          expense_categoryid: editRuleSelectedCategory?.id || undefined,
          subcategory_id: editRuleSelectedSubcategory?.id || undefined,
        }
      });
      setEditingRule(null);
      await loadRecurringRules();
    } catch (error) {
      console.error("Error updating rule:", error);
      Alert.alert("Error", "Could not update the subscription.");
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    editingRule,
    editRuleName,
    editRuleAmount,
    editRuleFrequency,
    editRuleSelectedCategory,
    editRuleSelectedSubcategory,
    loadRecurringRules
  ]);

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: 16 + insets.top,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              loadAccounts();
              loadCategories();
              loadExpenses();
              loadRecurringRules();
            }}
            tintColor={ui.text}
          />
        }
      >
        <View style={styles.headerRow}>
          <ThemedText type="title">Transactions</ThemedText>
          <Pressable onPress={() => router.push("/profile")}>
            <IconSymbol size={28} name="person" color={ui.text} />
          </Pressable>
        </View>

        {/* Custom Segmented Control */}
        <View
          style={[
            styles.tabsContainer,
            { backgroundColor: ui.surface2, borderColor: ui.border },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab("transactions")}
            style={[
              styles.tab,
              activeTab === "transactions" && {
                backgroundColor: ui.surface,
                borderColor: ui.border,
              },
              activeTab === "transactions" && styles.activeTab,
            ]}
          >
            <ThemedText
              type="defaultSemiBold"
              style={{ opacity: activeTab === "transactions" ? 1 : 0.6 }}
            >
              Log
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("subscriptions")}
            style={[
              styles.tab,
              activeTab === "subscriptions" && {
                backgroundColor: ui.surface,
                borderColor: ui.border,
              },
              activeTab === "subscriptions" && styles.activeTab,
            ]}
          >
            <ThemedText
              type="defaultSemiBold"
              style={{ opacity: activeTab === "subscriptions" ? 1 : 0.6 }}
            >
              Subscriptions
            </ThemedText>
          </Pressable>
        </View>

        {activeTab === "transactions" ? (
          <>
            {/* Account filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
            >
              <Pressable
                onPress={() => setFilterAccountId(null)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      filterAccountId === null ? ui.text : ui.surface2,
                    borderColor: ui.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: filterAccountId === null ? ui.surface : ui.text,
                  }}
                >
                  All
                </ThemedText>
              </Pressable>
              {accounts.map((acct) => (
                <Pressable
                  key={acct.id}
                  onPress={() => setFilterAccountId(acct.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        filterAccountId === acct.id ? ui.text : ui.surface2,
                      borderColor: ui.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: filterAccountId === acct.id ? ui.surface : ui.text,
                    }}
                  >
                    {acct.account_name ?? "Account"}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            {expenses.filter(
              (e) => filterAccountId === null || e.account_id === filterAccountId,
            ).length === 0 ? (
              <ThemedText>
                {isLoading ? "Loading…" : "No transactions found."}
              </ThemedText>
            ) : (
              expenses
                .filter(
                  (e) =>
                    filterAccountId === null || e.account_id === filterAccountId,
                )
                .map((expense) => (
                  <Pressable
                    key={expense.id}
                    onPress={() => setEditingExpense(expense)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <ThemedText type="defaultSemiBold">
                          {expense.description ?? "Transaction"}
                        </ThemedText>
                        {expense.recurring_rule_id && (() => {
                          const linkedRule = recurringRules.find((r) => r.id === expense.recurring_rule_id);
                          if (!linkedRule) return null;
                          const color = linkedRule.is_active ? "#FF9500" : ui.mutedText;
                          return (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <IconSymbol
                                name="arrow.triangle.2.circlepath"
                                size={12}
                                color={color}
                              />
                              <ThemedText style={{ color, fontSize: 12, fontWeight: "500" }}>
                                {linkedRule.is_active ? "Active" : "Inactive"}
                              </ThemedText>
                            </View>
                          );
                        })()}
                      </View>
                      <ThemedText type="default">
                        {formatDate(expense.created_at)}
                      </ThemedText>
                    </View>
                    <ThemedText type="defaultSemiBold">
                      {formatMoney(expense.amount ?? 0)}
                    </ThemedText>
                  </Pressable>
                ))
            )}
          </>
        ) : (
          <View
            style={[
              styles.card,
              { borderColor: ui.border, backgroundColor: ui.surface2 },
            ]}
          >
            <ThemedText type="defaultSemiBold">Your Subscriptions</ThemedText>
            {recurringRules.length === 0 ? (
              <ThemedText>
                {isLoading ? "Loading…" : "No subscriptions found."}
              </ThemedText>
            ) : (
              recurringRules.map((rule) => (
                <Pressable
                  key={rule.id}
                  onPress={() => setEditingRule(rule)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderColor: ui.border,
                      backgroundColor: ui.surface,
                      opacity: pressed ? 0.7 : (rule.is_active ? 1 : 0.6),
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">
                      {rule.name ?? "Subscription"}
                    </ThemedText>
                    <ThemedText type="default" style={{ color: ui.mutedText, fontSize: 13 }}>
                      {rule.frequency} • {rule.is_active ? "Active" : "Paused"}
                    </ThemedText>
                    {(rule.is_active || rule.end_date) && (
                      <ThemedText type="default" style={{ color: ui.mutedText, fontSize: 13 }}>
                        {rule.is_active ? `Next: ${formatDate(rule.next_run_date)}` : ""}
                        {rule.is_active && rule.end_date ? " • " : ""}
                        {rule.end_date ? `Ends: ${formatDate(rule.end_date)}` : ""}
                      </ThemedText>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 8 }}>
                    <ThemedText type="defaultSemiBold">
                      {formatMoney(rule.amount ?? 0)}
                    </ThemedText>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Pressable onPress={() => handleToggleRuleStatus(rule)}>
                        <ThemedText style={{ color: ui.text, fontWeight: "600", fontSize: 13 }}>
                          {rule.is_active ? "Pause" : "Resume"}
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteRule(rule.id)}>
                        <ThemedText style={{ color: "#FF3B30", fontWeight: "600", fontSize: 13 }}>
                          Delete
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => setAddModalOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: ui.text,
            opacity: pressed ? 0.8 : 1,
            bottom: fabBottom,
          },
        ]}
      >
        <IconSymbol name="plus" size={32} color={ui.surface} />
      </Pressable>

      <Modal
        visible={addModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddModalOpen(false)}
      >
        <ThemedView
          style={{
            flex: 1,
            padding: 16,
            paddingTop: 16 + insets.top,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <ThemedText type="title">Add Transaction</ThemedText>
            <Pressable onPress={() => setAddModalOpen(false)}>
              <ThemedText style={{ color: "#007AFF" }}>Cancel</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
            <View style={styles.fieldGroup}>
              <ThemedText type="defaultSemiBold">Account</ThemedText>
              <Pressable
                onPress={() => setAccountModalOpen(true)}
                style={[
                  styles.dropdownButton,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
              >
                <ThemedText>
                  {selectedAccount?.account_name ?? "Select an account"}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="defaultSemiBold">Category</ThemedText>
              <Pressable
                onPress={() => setCategoryModalOpen(true)}
                style={[
                  styles.dropdownButton,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
              >
                <ThemedText>
                  {selectedCategory?.category_name ?? "Select a category"}
                </ThemedText>
              </Pressable>
            </View>

            {/* Subcategory Picker Input */}
            {selectedCategory && (
              <View style={styles.fieldGroup}>
                <ThemedText type="defaultSemiBold">Subcategory</ThemedText>
                <Pressable
                  onPress={() => setSubcategoryModalOpen(true)}
                  style={[
                    styles.dropdownButton,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                >
                  <ThemedText>
                    {selectedSubcategory?.category_name ?? "Select subcategory"}
                  </ThemedText>
                </Pressable>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <ThemedText type="defaultSemiBold">Amount</ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={ui.mutedText}
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    color: ui.text,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="defaultSemiBold">Description</ThemedText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Grocery run"
                placeholderTextColor={ui.mutedText}
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    color: ui.text,
                  },
                ]}
              />
            </View>

            <View style={[styles.fieldGroup, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
              <ThemedText type="defaultSemiBold">Make Recurring</ThemedText>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: ui.border, true: "#34C759" }}
              />
            </View>

            {isRecurring && (
              <View style={styles.fieldGroup}>
                <ThemedText type="defaultSemiBold">Frequency</ThemedText>
                <Pressable
                  onPress={() => setFrequencyModalOpen(true)}
                  style={[
                    styles.dropdownButton,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                >
                  <ThemedText>{recurringFrequency}</ThemedText>
                </Pressable>
              </View>
            )}

            {isRecurring && (
              <View style={styles.fieldGroup}>
                <ThemedText type="defaultSemiBold">Ends On (Optional)</ThemedText>
                <TextInput
                  value={addRuleEndsOn}
                  onChangeText={setAddRuleEndsOn}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={ui.mutedText}
                  style={[
                    styles.input,
                    {
                      borderColor: ui.border,
                      backgroundColor: ui.surface,
                      color: ui.text,
                    },
                  ]}
                />
              </View>
            )}

            <Pressable
              onPress={createTransaction}
              disabled={!canCreate || isLoading}
              style={[
                styles.button,
                { borderColor: ui.border, backgroundColor: ui.text },
                (!canCreate || isLoading) && styles.buttonDisabled,
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
                Add transaction
              </ThemedText>
            </Pressable>
          </ScrollView>

          {/* Subcategory Picker Overlay (Add) */}
          {subcategoryModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setSubcategoryModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">
                  Select subcategory
                </ThemedText>

                {subcategories.length === 0 ? (
                  <ThemedText>No subcategories found.</ThemedText>
                ) : (
                  subcategories.map((sub) => (
                    <View
                      key={sub.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        style={[
                          styles.modalOption,
                          {
                            borderColor: ui.border,
                            backgroundColor: ui.surface,
                            flex: 1,
                          },
                        ]}
                        onPress={() => {
                          setSelectedSubcategory(sub);
                          setSubcategoryModalOpen(false);
                        }}
                      >
                        <ThemedText>
                          {sub.category_name ?? "Unnamed subcategory"}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSubcategory(sub.id)}
                        style={{ padding: 8 }}
                      >
                        <IconSymbol name="trash" size={20} color="#FF3B30" />
                      </Pressable>
                    </View>
                  ))
                )}

                <View style={styles.fieldGroup}>
                  <TextInput
                    value={newSubcategoryName}
                    onChangeText={setNewSubcategoryName}
                    placeholder="New subcategory name"
                    placeholderTextColor={ui.mutedText}
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface,
                        color: ui.text,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={createSubcategory}
                    style={[
                      styles.button,
                      { borderColor: ui.border, backgroundColor: ui.surface },
                    ]}
                  >
                    <ThemedText type="defaultSemiBold">
                      Add subcategory
                    </ThemedText>
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setSubcategoryModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}

          {/* Account Picker Overlay (Add) */}
          {accountModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setAccountModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">Select account</ThemedText>

                {accounts.length === 0 ? (
                  <ThemedText>
                    {isLoading ? "Loading…" : "No accounts yet."}
                  </ThemedText>
                ) : (
                  accounts.map((account) => (
                    <Pressable
                      key={account.id}
                      style={[
                        styles.modalOption,
                        { borderColor: ui.border, backgroundColor: ui.surface },
                      ]}
                      onPress={() => {
                        setSelectedAccount(account);
                        setAccountModalOpen(false);
                      }}
                    >
                      <ThemedText>
                        {account.account_name ?? "Unnamed account"}
                      </ThemedText>
                      <ThemedText type="default">
                        {account.account_type
                          ? account.account_type.charAt(0).toUpperCase() +
                          account.account_type.slice(1)
                          : "—"}{" "}
                        {account.currency ?? ""}
                      </ThemedText>
                    </Pressable>
                  ))
                )}

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setAccountModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}

          {/* Category Picker Overlay (Add) */}
          {categoryModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setCategoryModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">Select category</ThemedText>

                {categories.length === 0 ? (
                  <ThemedText>No categories yet.</ThemedText>
                ) : (
                  categories.map((category) => (
                    <View
                      key={category.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        style={[
                          styles.modalOption,
                          {
                            borderColor: ui.border,
                            backgroundColor: ui.surface,
                            flex: 1,
                          },
                        ]}
                        onPress={() => {
                          setSelectedCategory(category);
                          setCategoryModalOpen(false);
                        }}
                      >
                        <ThemedText>
                          {category.category_name ?? "Unnamed category"}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteCategory(category.id)}
                        style={{ padding: 8 }}
                      >
                        <IconSymbol name="trash" size={20} color="#FF3B30" />
                      </Pressable>
                    </View>
                  ))
                )}

                <View style={styles.fieldGroup}>
                  <TextInput
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder="New category name"
                    placeholderTextColor={ui.mutedText}
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface,
                        color: ui.text,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={createCategory}
                    style={[
                      styles.button,
                      { borderColor: ui.border, backgroundColor: ui.surface },
                    ]}
                  >
                    <ThemedText type="defaultSemiBold">Add category</ThemedText>
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setCategoryModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}
        </ThemedView>
      </Modal>

      {/* Frequency Picker Overlay (Add) */}
      {frequencyModalOpen && (
        <Modal
          visible={frequencyModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setFrequencyModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalBackdrop,
              StyleSheet.absoluteFill,
              { backgroundColor: ui.backdrop, zIndex: 100 },
            ]}
            onPress={() => setFrequencyModalOpen(false)}
          >
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: ui.surface2, borderColor: ui.border },
              ]}
              onPress={() => { }}
            >
              <ThemedText type="defaultSemiBold">Select Frequency</ThemedText>
              {["Daily", "Weekly", "Monthly", "Yearly"].map((freq) => (
                <Pressable
                  key={freq}
                  style={[
                    styles.modalOption,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => {
                    setRecurringFrequency(freq);
                    setFrequencyModalOpen(false);
                  }}
                >
                  <ThemedText>{freq}</ThemedText>
                </Pressable>
              ))}
              <Pressable
                style={[
                  styles.modalOption,
                  styles.modalCancel,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
                onPress={() => setFrequencyModalOpen(false)}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      <Modal
        visible={!!editingExpense}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingExpense(null)}
      >
        <ThemedView
          style={{
            flex: 1,
            padding: 16,
            paddingTop: 16 + insets.top,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <ThemedText type="title">Edit Transaction</ThemedText>
            <Pressable onPress={() => setEditingExpense(null)}>
              <ThemedText style={{ color: "#007AFF" }}>Cancel</ThemedText>
            </Pressable>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <ThemedText type="defaultSemiBold">Account</ThemedText>
              <Pressable
                onPress={() => setEditAccountModalOpen(true)}
                style={[
                  styles.dropdownButton,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
              >
                <ThemedText>
                  {editSelectedAccount?.account_name ?? "Select an account"}
                </ThemedText>
              </Pressable>
            </View>

            <View style={{ gap: 6 }}>
              <ThemedText type="defaultSemiBold">Category</ThemedText>
              <Pressable
                onPress={() => setEditCategoryModalOpen(true)}
                style={[
                  styles.dropdownButton,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
              >
                <ThemedText>
                  {editSelectedCategory?.category_name ?? "Select a category"}
                </ThemedText>
              </Pressable>
            </View>

            {editSelectedCategory && (
              <View style={{ gap: 6 }}>
                <ThemedText type="defaultSemiBold">Subcategory</ThemedText>
                <Pressable
                  onPress={() => setEditSubcategoryModalOpen(true)}
                  style={[
                    styles.dropdownButton,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                >
                  <ThemedText>
                    {editSelectedSubcategory?.category_name ??
                      "Select subcategory"}
                  </ThemedText>
                </Pressable>
              </View>
            )}

            <View style={{ gap: 6 }}>
              <ThemedText type="defaultSemiBold">Amount</ThemedText>
              <TextInput
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    color: ui.text,
                  },
                ]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <ThemedText type="defaultSemiBold">Description</ThemedText>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                style={[
                  styles.input,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    color: ui.text,
                  },
                ]}
              />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <ThemedText type="defaultSemiBold">Make Recurring</ThemedText>
              <Switch
                value={editTransactionIsRecurring}
                onValueChange={setEditTransactionIsRecurring}
                trackColor={{ false: ui.border, true: "#34C759" }}
              />
            </View>

            {editTransactionIsRecurring && (
              <View style={{ gap: 6 }}>
                <ThemedText type="defaultSemiBold">Frequency</ThemedText>
                <Pressable
                  onPress={() => setFrequencyModalOpen(true)}
                  style={[
                    styles.dropdownButton,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                >
                  <ThemedText>{editTransactionRecurringFrequency}</ThemedText>
                </Pressable>
              </View>
            )}

            {editTransactionIsRecurring && (
              <View style={{ gap: 6 }}>
                <ThemedText type="defaultSemiBold">Ends On (Optional)</ThemedText>
                <TextInput
                  value={editTransactionRuleEndsOn}
                  onChangeText={setEditTransactionRuleEndsOn}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={ui.mutedText}
                  style={[
                    styles.input,
                    {
                      borderColor: ui.border,
                      backgroundColor: ui.surface,
                      color: ui.text,
                    },
                  ]}
                />
              </View>
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
                },
                isLoading && styles.buttonDisabled,
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
                Save Changes
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={deleteTransaction}
              disabled={isLoading}
              style={[
                styles.deleteAction,
                { borderColor: ui.border, backgroundColor: ui.surface },
                isLoading && styles.buttonDisabled,
              ]}
            >
              <ThemedText style={{ color: "#FF3B30" }}>
                Delete Transaction
              </ThemedText>
            </Pressable>
          </View>

          {/* Subcategory Picker Overlay (Edit) */}
          {editSubcategoryModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setEditSubcategoryModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">
                  Select subcategory
                </ThemedText>

                {editSubcategories.length === 0 ? (
                  <ThemedText>No subcategories found.</ThemedText>
                ) : (
                  editSubcategories.map((sub) => (
                    <View
                      key={sub.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        style={[
                          styles.modalOption,
                          {
                            borderColor: ui.border,
                            backgroundColor: ui.surface,
                            flex: 1,
                          },
                        ]}
                        onPress={() => {
                          setEditSelectedSubcategory(sub);
                          setEditSubcategoryModalOpen(false);
                        }}
                      >
                        <ThemedText>
                          {sub.category_name ?? "Unnamed subcategory"}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSubcategory(sub.id)}
                        style={{ padding: 8 }}
                      >
                        <IconSymbol name="trash" size={20} color="#FF3B30" />
                      </Pressable>
                    </View>
                  ))
                )}

                <View style={styles.fieldGroup}>
                  <TextInput
                    value={newSubcategoryName}
                    onChangeText={setNewSubcategoryName}
                    placeholder="New subcategory name"
                    placeholderTextColor={ui.mutedText}
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface,
                        color: ui.text,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={createEditSubcategory}
                    style={[
                      styles.button,
                      { borderColor: ui.border, backgroundColor: ui.surface },
                    ]}
                  >
                    <ThemedText type="defaultSemiBold">
                      Add subcategory
                    </ThemedText>
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setEditSubcategoryModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}

          {/* Account Picker Overlay (Edit) */}
          {editAccountModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setEditAccountModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">Select account</ThemedText>

                {accounts.length === 0 ? (
                  <ThemedText>
                    {isLoading ? "Loading…" : "No accounts yet."}
                  </ThemedText>
                ) : (
                  accounts.map((account) => (
                    <Pressable
                      key={account.id}
                      style={[
                        styles.modalOption,
                        { borderColor: ui.border, backgroundColor: ui.surface },
                      ]}
                      onPress={() => {
                        setEditSelectedAccount(account);
                        setEditAccountModalOpen(false);
                      }}
                    >
                      <ThemedText>
                        {account.account_name ?? "Unnamed account"}
                      </ThemedText>
                      <ThemedText type="default">
                        {account.account_type
                          ? account.account_type.charAt(0).toUpperCase() +
                          account.account_type.slice(1)
                          : "—"}{" "}
                        {account.currency ?? ""}
                      </ThemedText>
                    </Pressable>
                  ))
                )}

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setEditAccountModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}

          {/* Category Picker Overlay (Edit) */}
          {editCategoryModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setEditCategoryModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">Select category</ThemedText>

                {categories.length === 0 ? (
                  <ThemedText>No categories yet.</ThemedText>
                ) : (
                  categories.map((category) => (
                    <View
                      key={category.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        style={[
                          styles.modalOption,
                          {
                            borderColor: ui.border,
                            backgroundColor: ui.surface,
                            flex: 1,
                          },
                        ]}
                        onPress={() => {
                          setEditSelectedCategory(category);
                          setEditCategoryModalOpen(false);
                        }}
                      >
                        <ThemedText>
                          {category.category_name ?? "Unnamed category"}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteCategory(category.id)}
                        style={{ padding: 8 }}
                      >
                        <IconSymbol name="trash" size={20} color="#FF3B30" />
                      </Pressable>
                    </View>
                  ))
                )}

                <View style={styles.fieldGroup}>
                  <TextInput
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder="New category name"
                    placeholderTextColor={ui.mutedText}
                    style={[
                      styles.input,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface,
                        color: ui.text,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={createEditCategory}
                    style={[
                      styles.button,
                      { borderColor: ui.border, backgroundColor: ui.surface },
                    ]}
                  >
                    <ThemedText type="defaultSemiBold">Add category</ThemedText>
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setEditCategoryModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}
        </ThemedView>
      </Modal>

      {/* Edit Subscription Modal */}
      <Modal
        visible={!!editingRule}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingRule(null)}
      >
        <ThemedView
          style={{
            flex: 1,
            padding: 16,
            paddingTop: 16 + insets.top,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <ThemedText type="title">Edit Subscription</ThemedText>
            <Pressable onPress={() => setEditingRule(null)}>
              <ThemedText style={{ color: "#007AFF" }}>Cancel</ThemedText>
            </Pressable>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <ThemedText type="defaultSemiBold">Description</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: ui.border, color: ui.text, backgroundColor: ui.surface2 },
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
                  { borderColor: ui.border, color: ui.text, backgroundColor: ui.surface2 },
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
                  {editRuleSelectedCategory?.category_name ?? "Select Category"}
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
                    {editRuleSelectedSubcategory?.category_name ?? "None (Optional)"}
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

            <View style={{ gap: 6 }}>
              <ThemedText type="defaultSemiBold">Ends On (Optional)</ThemedText>
              <TextInput
                value={editRuleEndsOn}
                onChangeText={setEditRuleEndsOn}
                placeholder="YYYY-MM-DD"
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
          </View>

          <View style={{ flex: 1 }} />
          <Pressable
            onPress={handleSaveRuleEdit}
            style={[
              styles.button,
              { backgroundColor: ui.text, width: "100%", alignItems: "center" },
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

          {/* Subcategory Picker Overlay (Edit Rule) */}
          {editRuleSubcategoryModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setEditRuleSubcategoryModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">
                  Select subcategory
                </ThemedText>

                {editRuleSubcategories.length === 0 ? (
                  <ThemedText>No subcategories found.</ThemedText>
                ) : (
                  editRuleSubcategories.map((sub) => (
                    <View
                      key={sub.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        style={[
                          styles.modalOption,
                          {
                            borderColor: ui.border,
                            backgroundColor: ui.surface,
                            flex: 1,
                          },
                        ]}
                        onPress={() => {
                          setEditRuleSelectedSubcategory(sub);
                          setEditRuleSubcategoryModalOpen(false);
                        }}
                      >
                        <ThemedText>
                          {sub.category_name ?? "Unnamed subcategory"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))
                )}

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setEditRuleSubcategoryModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}

          {/* Category Picker Overlay (Edit Rule) */}
          {editRuleCategoryModalOpen && (
            <Pressable
              style={[
                styles.modalBackdrop,
                StyleSheet.absoluteFill,
                { backgroundColor: ui.backdrop, zIndex: 100 },
              ]}
              onPress={() => setEditRuleCategoryModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { backgroundColor: ui.surface2, borderColor: ui.border },
                ]}
                onPress={() => { }}
              >
                <ThemedText type="defaultSemiBold">Select category</ThemedText>

                {categories.length === 0 ? (
                  <ThemedText>No categories yet.</ThemedText>
                ) : (
                  categories.map((category) => (
                    <View
                      key={category.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        style={[
                          styles.modalOption,
                          {
                            borderColor: ui.border,
                            backgroundColor: ui.surface,
                            flex: 1,
                          },
                        ]}
                        onPress={() => {
                          setEditRuleSelectedCategory(category);
                          setEditRuleSelectedSubcategory(null);
                          setEditRuleCategoryModalOpen(false);
                        }}
                      >
                        <ThemedText>
                          {category.category_name ?? "Unnamed category"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))
                )}

                <Pressable
                  style={[
                    styles.modalOption,
                    styles.modalCancel,
                    { borderColor: ui.border, backgroundColor: ui.surface },
                  ]}
                  onPress={() => setEditRuleCategoryModalOpen(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}

          {/* Frequency Picker Overlay (Edit Rule) */}
          {editRuleFrequencyModalOpen && (
            <Modal
              visible={editRuleFrequencyModalOpen}
              animationType="fade"
              transparent
              onRequestClose={() => setEditRuleFrequencyModalOpen(false)}
            >
              <Pressable
                style={[
                  styles.modalBackdrop,
                  StyleSheet.absoluteFill,
                  { backgroundColor: ui.backdrop, zIndex: 100 },
                ]}
                onPress={() => setEditRuleFrequencyModalOpen(false)}
              >
                <Pressable
                  style={[
                    styles.modalCard,
                    { backgroundColor: ui.surface2, borderColor: ui.border },
                  ]}
                  onPress={() => { }}
                >
                  <ThemedText type="defaultSemiBold">Select Frequency</ThemedText>
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
                  <Pressable
                    style={[
                      styles.modalOption,
                      styles.modalCancel,
                      { borderColor: ui.border, backgroundColor: ui.surface },
                    ]}
                    onPress={() => setEditRuleFrequencyModalOpen(false)}
                  >
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          )}

        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonDisabled: { opacity: 0.5 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  modalCancel: {
    opacity: 0.9,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  deleteAction: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
  }
});
