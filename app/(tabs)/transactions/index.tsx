import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { AddTransactionModal } from "@/components/AddTransactionModal";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { TransactionsList } from "@/components/transactions/TransactionsList";
import { AppHeader } from "@/components/ui/AppHeader";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { useTabTransition } from "@/components/ui/useTabTransition";
import { useTabSwipe } from "@/components/ui/useTabSwipe";
import { Tokens } from "@/constants/authTokens";
import { tabsTheme } from "@/constants/tabsTheme";
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
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { deleteExpense, listExpenses } from "@/utils/expenses";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import { getPlaidAccounts, getPlaidTransactions } from "@/utils/plaid";
import {
  deleteRecurringRule,
  getRecurringRules,
  updateRecurringRule
} from "@/utils/recurring";

import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";

export default function HomeScreen() {
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
  const handleProfilePress = useCallback(() => {
    router.push("/profile");
  }, [router]);
  const transition = useTabTransition();
  const swipe = useTabSwipe(2);

  // Dynamic tab bar height
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = insets.bottom + 60;
  }
  const fabBottom = tabBarHeight - 16;
  const ui = tabsTheme.ui;

  const userId = session?.user.id;

  type AccountRow = {
    id: number;
    account_name: string | null;
    account_type: string | null;
    balance: number | null;
    currency: string | null;
  };

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

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<PlaidTransaction[]>([]);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([]);

  // Tabs and Rules State
  const [activeTab, setActiveTab] = useState<"transactions" | "recurrences">(
    "transactions",
  );
  const [recurringRules, setRecurringRules] = useState<any[]>([]); // Adjust type to RecurringExpenseRule if you import it
  const [editingRule, setEditingRule] = useState<any | null>(null);

  const [filterAccountId, setFilterAccountId] = useState<string | number | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);

  const [selectedDetailTransaction, setSelectedDetailTransaction] = useState<ExpenseRow | PlaidTransaction | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // States for Recurring Rule Editing (still in index.tsx)
  const [editRuleName, setEditRuleName] = useState("");
  const [editRuleAmount, setEditRuleAmount] = useState("");
  const [editRuleFrequency, setEditRuleFrequency] = useState("Monthly");
  const [isEditEndsOnEnabled, setIsEditEndsOnEnabled] = useState(false);
  const [editRuleEndsOn, setEditRuleEndsOn] = useState("");
  const [editRuleNextRunDate, setEditRuleNextRunDate] = useState("");
  const [editRuleSelectedCategory, setEditRuleSelectedCategory] = useState<CategoryRow | null>(null);
  const [editRuleSubcategories, setEditRuleSubcategories] = useState<SubcategoryRow[]>([]);
  const [editRuleSelectedSubcategory, setEditRuleSelectedSubcategory] = useState<SubcategoryRow | null>(null);

  // Modal visibility for Recurring Rule Editing
  const [editRuleFrequencyModalOpen, setEditRuleFrequencyModalOpen] = useState(false);
  const [editRuleCategoryModalOpen, setEditRuleCategoryModalOpen] = useState(false);
  const [editRuleSubcategoryModalOpen, setEditRuleSubcategoryModalOpen] = useState(false);

  const tabFade = useRef(new Animated.Value(1)).current;
  const lastOpenAddRef = useRef<string | null>(null);

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return "";
    // Parse YYYY-MM-DD as local time to avoid UTC midnight timezone shift
    const parts = value.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const local = new Date(y, m - 1, d);
      if (!Number.isNaN(local.getTime())) {
        return local.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatMoney = useCallback((value?: number | null) => {
    if (value == null) return "0.00";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(value);
  }, []);

  const selectedIsPlaid =
    !!selectedDetailTransaction &&
    "transaction_id" in selectedDetailTransaction;
  const selectedManualExpense =
    !!selectedDetailTransaction && !selectedIsPlaid
      ? (selectedDetailTransaction as ExpenseRow)
      : null;

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

  useEffect(() => {
    if (openAdd && openAdd !== lastOpenAddRef.current) {
      setAddModalOpen(true);
      lastOpenAddRef.current = openAdd;
    }
  }, [openAdd]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: "Search transactions...",
          onChangeText: (event: any) => setSearchQuery(event.nativeEvent.text),
          hideWhenScrolling: true,
          tintColor: ui.text,
          textColor: ui.text,
          hintTextColor: ui.mutedText,
          headerIconColor: ui.mutedText,
          shouldShowHintSearchIcon: false,
        },
      });
    }, [navigation, ui])
  );



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

  const handleDeleteExpense = useCallback(
    (expense: ExpenseRow) => {
      if (!userId) return;

      const executeDelete = async () => {
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

          await loadExpenses();
          await loadAccounts();
          await loadCategories();
          await loadRecurringRules();
          setIsDetailModalVisible(false);
          setSelectedDetailTransaction(null);
        } catch (error) {
          console.error("Error deleting transaction:", error);
          Alert.alert("Error", "Could not delete transaction.");
        } finally {
          setIsLoading(false);
        }
      };

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
                  Alert.alert(
                    "Error",
                    "Could not cancel future recurring transactions.",
                  );
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
        return;
      }

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
    },
    [
      applyTransactionToBalance,
      deleteRecurringRule,
      getAccountById,
      loadAccounts,
      loadCategories,
      loadExpenses,
      loadRecurringRules,
      updateAccount,
      userId,
    ],
  );

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
    tabFade.setValue(0);
    Animated.timing(tabFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabFade]);



  useEffect(() => {
    if (!editingRule) return;
    setEditRuleName(editingRule.name || "");
    setEditRuleAmount(editingRule.amount?.toString() || "");
    setEditRuleFrequency(editingRule.frequency || "Monthly");
    setIsEditEndsOnEnabled(!!editingRule.end_date);
    setEditRuleEndsOn(editingRule.end_date || "");
    setEditRuleNextRunDate(editingRule.next_run_date || "");

    const categoryMatch = categories.find(
      (c) => c.id === editingRule.expense_categoryid,
    );
    setEditRuleSelectedCategory(categoryMatch ?? null);

    if (categoryMatch && editingRule.subcategory_id) {
      listSubcategories({
        profile_id: session?.user.id ?? "",
        category_id: categoryMatch.id,
      }).then((subs) => {
        setEditRuleSubcategories((subs as SubcategoryRow[]) ?? []);
        const subMatch = (subs as SubcategoryRow[]).find(
          (s) => s.id === editingRule.subcategory_id,
        );
        setEditRuleSelectedSubcategory(subMatch ?? null);
      });
    } else {
      setEditRuleSelectedSubcategory(null);
    }
  }, [editingRule, categories, session]);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        loadAccounts(true);
        loadCategories();
        loadExpenses();
        loadRecurringRules();
        // Also load Plaid transactions and accounts
        if (userId) {
          getPlaidTransactions()
            .then(setPlaidTransactions)
            .catch((err: any) => console.error("Error loading Plaid transactions:", err));
          getPlaidAccounts()
            .then(setPlaidAccounts)
            .catch((err: any) => console.error("Error loading Plaid accounts:", err));
        }
      });
      return () => task.cancel();
    }, [loadAccounts, loadCategories, loadExpenses, loadRecurringRules, userId]),
  );


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
      // refresh list
      const subs = await listSubcategories({
        profile_id: userId,
        category_id: editRuleSelectedCategory.id,
      });
      setEditRuleSubcategories((subs as SubcategoryRow[]) ?? []);
      // Keep modal open so user can see it's selected
    } catch (err) {
      console.error("Error creating subcategory", err);
      Alert.alert("Error", "Could not create subcategory.");
    }
  }, [userId, editRuleSelectedCategory, newSubcategoryName]);


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
      await loadCategories();
      // Keep modal open so user can see it's selected
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
    [userId, loadCategories, editRuleSelectedCategory],
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
                  const editSubs = await listSubcategories({
                    profile_id: userId,
                    category_id: editRuleSelectedCategory.id,
                  });
                  setEditRuleSubcategories(editSubs);
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
    [
      userId,
      editRuleSelectedCategory,
      editRuleSelectedSubcategory,
    ],
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
                await loadRecurringRules();
                setEditingRule(null);
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
    [userId, loadRecurringRules],
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
        setEditingRule(null);
        await loadRecurringRules();
      } catch (error) {
        console.error("Error updating rule:", error);
        Alert.alert("Error", "Could not update the recurrence.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      userId,
      editingRule,
      editRuleName,
      editRuleAmount,
      editRuleFrequency,
      editRuleEndsOn,
      editRuleNextRunDate,
      editRuleSelectedCategory,
      editRuleSelectedSubcategory,
      loadRecurringRules,
    ],
  );

  return (
    <PanGestureHandler
      onGestureEvent={swipe.onGestureEvent}
      onHandlerStateChange={swipe.onHandlerStateChange}
      activeOffsetX={[-20, 20]}
      failOffsetY={[-15, 15]}
    >
      <View style={[styles.screen, { backgroundColor: ui.bg }]}>
        <AppHeader title="Transactions" onRightPress={handleProfilePress} />
        <Animated.View
          style={[styles.contentWrap, transition.style, swipe.style]}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
        <ScrollView
          style={styles.container}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 120, paddingTop: 16 }]}
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

        <View
          style={[
            styles.segmentedControl,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab("transactions")}
            style={({ pressed }) => [
              styles.segmentButton,
              {
                backgroundColor:
                  activeTab === "transactions" ? ui.text : "transparent",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.segmentText,
                { color: activeTab === "transactions" ? ui.surface : ui.text },
              ]}
            >
              Transactions
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("recurrences")}
            style={({ pressed }) => [
              styles.segmentButton,
              {
                backgroundColor:
                  activeTab === "recurrences" ? ui.text : "transparent",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.segmentText,
                { color: activeTab === "recurrences" ? ui.surface : ui.text },
              ]}
            >
              Recurring
            </ThemedText>
          </Pressable>
        </View>



        {activeTab === "transactions" ? (
          <Animated.View
            style={[
              styles.tabFade,
              {
                opacity: tabFade,
                transform: [
                  {
                    translateY: tabFade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TransactionsList
              ui={ui}
              expenses={expenses}
              plaidTransactions={plaidTransactions}
              recurringRules={recurringRules}
              accounts={accounts}
              plaidAccounts={plaidAccounts}
              filterAccountId={filterAccountId}
              onFilterAccountChange={setFilterAccountId}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSelectTransaction={(tx) => {
                setSelectedDetailTransaction(tx);
                setIsDetailModalVisible(true);
              }}
              isLoading={isLoading}
            />
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.tabFade,
              {
                opacity: tabFade,
                transform: [
                  {
                    translateY: tabFade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {recurringRules
              .filter((r) => {
                const matchesAccount =
                  filterAccountId === null || r.account_id === filterAccountId;
                const matchesSearch =
                  !searchQuery ||
                  (r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.amount?.toString().includes(searchQuery));
                return matchesAccount && matchesSearch;
              })
              .sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1))
              .length === 0 ? (
              <ThemedText style={{ padding: 16, color: ui.mutedText }}>
                {isLoading ? "Loading..." : "No recurrences found."}
              </ThemedText>
            ) : (
              recurringRules
                .filter((r) => {
                  const matchesAccount =
                    filterAccountId === null || r.account_id === filterAccountId;
                  const matchesSearch =
                    !searchQuery ||
                    (r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.amount?.toString().includes(searchQuery));
                  return matchesAccount && matchesSearch;
                })
                .sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1))
                .map((rule) => (
                  <Pressable
                    key={rule.id}
                    onPress={() => setEditingRule(rule)}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface2,
                        opacity: pressed ? 0.7 : (rule.is_active ? 1 : 0.6),
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">
                        {rule.name ?? "Subscription"}
                      </ThemedText>
                      <ThemedText type="default" style={{ color: ui.mutedText, fontSize: 13 }}>
                        {rule.frequency} - {rule.is_active ? "Active" : "Paused"}
                      </ThemedText>
                      {(rule.is_active || rule.end_date) && (
                        <ThemedText type="default" style={{ color: ui.mutedText, fontSize: 13 }}>
                          {rule.is_active ? `Next: ${formatDate(rule.next_run_date)}` : ""}
                          {rule.is_active && rule.end_date ? " - " : ""}
                          {rule.end_date ? `Ends: ${formatDate(rule.end_date)}` : ""}
                        </ThemedText>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      <ThemedText type="defaultSemiBold">
                        {formatMoney(rule.amount ?? 0)}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))
            )}
          </Animated.View>
        )}



        </ScrollView>
      </Animated.View>

      <Pressable
        onPress={() => setAddModalOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          {
            width: 60,
            height: 60,
            borderRadius: 16,
            right: 16,
          },
          {
            backgroundColor: ui.text,
            opacity: pressed ? 0.8 : 1,
            bottom: fabBottom,
            elevation: Platform.OS === "android" ? 5 : 6,
          },
        ]}
      >
        <IconSymbol name="plus" size={24} color={ui.surface} />
      </Pressable>

      <AddTransactionModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        accounts={accounts}
        categories={categories}
        onRefresh={async () => {
          await loadExpenses();
          await loadAccounts();
          await loadCategories();
          await loadRecurringRules();
        }}
        ui={ui}
        isDark={false}
        userId={userId}
      />

      <AddTransactionModal
        visible={isDetailModalVisible && !!selectedManualExpense}
        onClose={() => {
          setIsDetailModalVisible(false);
          setSelectedDetailTransaction(null);
        }}
        accounts={accounts}
        categories={categories}
        onRefresh={async () => {
          await loadExpenses();
          await loadAccounts();
          await loadCategories();
          await loadRecurringRules();
        }}
        ui={ui}
        isDark={false}
        userId={userId}
        mode="view"
        initialTransaction={selectedManualExpense}
        recurringRules={recurringRules}
        onEditRequest={() => {
          if (selectedManualExpense) {
            setEditingExpense(selectedManualExpense);
            setIsDetailModalVisible(false);
          }
        }}
        onDeleteRequest={() => {
          if (selectedManualExpense) {
            handleDeleteExpense(selectedManualExpense);
          }
        }}
      />

      {/* Transaction Detail Modal (Plaid) */}
      <TransactionDetailModal
        visible={isDetailModalVisible && !!selectedIsPlaid}
        onClose={() => {
          setIsDetailModalVisible(false);
          setSelectedDetailTransaction(null);
        }}
        transaction={selectedDetailTransaction}
        accounts={accounts}
        recurringRules={recurringRules}
      />

      <AddTransactionModal
        visible={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        accounts={accounts}
        categories={categories}
        onRefresh={async () => {
          await loadExpenses();
          await loadAccounts();
          await loadCategories();
          await loadRecurringRules();
        }}
        ui={ui}
        isDark={false}
        userId={userId}
        mode="edit"
        initialTransaction={editingExpense}
        recurringRules={recurringRules}
      />


      {/* Edit Recurrance Modal */}
      <Modal
        visible={!!editingRule}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingRule(null)}
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
            <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>Edit Recurrence</ThemedText>
            <View style={styles.modalHeaderRight}>
              <Pressable
                onPress={() => setEditingRule(null)}
                hitSlop={20}
                style={[styles.modalCloseButton, { backgroundColor: ui.surface2 }]}
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
                onChange={(date) => setEditRuleNextRunDate(toLocalISOString(date))}
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
              onPress={() => handleSaveRuleEdit(!editingRule.is_active)}
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
              onPress={() => handleDeleteRule(editingRule?.id)}
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

      {/* Edit Rule: Frequency Picker */}
      <SelectionModal
        visible={editRuleFrequencyModalOpen}
        onClose={() => setEditRuleFrequencyModalOpen(false)}
        title="Select Frequency"
        ui={ui}
      >
        {["Daily", "Weekly", "Monthly", "Yearly"].map((freq) => (
          <Pressable
            key={freq}
            style={[styles.modalOption, { borderColor: ui.border, backgroundColor: ui.surface }]}
            onPress={() => {
              setEditRuleFrequency(freq);
              setEditRuleFrequencyModalOpen(false);
            }}
          >
            <ThemedText>{freq}</ThemedText>
          </Pressable>
        ))}
      </SelectionModal>

      {/* Edit Rule: Category Picker */}
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
              style={[styles.footerInput, { borderColor: ui.border, backgroundColor: ui.surface, color: ui.text }]}
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
                  backgroundColor: editRuleSelectedCategory?.id === cat.id ? ui.accentSoft : ui.surface2,
                }
              ]}
            >
              <Pressable
                style={{ paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}
                onPress={() => {
                  setEditRuleSelectedCategory(cat);
                  setEditRuleSelectedSubcategory(null);
                  setEditRuleCategoryModalOpen(false);
                }}
              >
                <ThemedText style={{ color: editRuleSelectedCategory?.id === cat.id ? ui.accent : ui.text, fontWeight: '500' }}>
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

      {/* Edit Rule: Subcategory Picker */}
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
              style={[styles.footerInput, { borderColor: ui.border, backgroundColor: ui.surface, color: ui.text }]}
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
        {editRuleSubcategories.length === 0 ? (
          <ThemedText style={{ textAlign: "center", padding: 20 }}>No subcategories found.</ThemedText>
        ) : (
          editRuleSubcategories.map((sub) => (
            <View
              key={sub.id}
              style={[
                styles.tag,
                {
                  borderColor: ui.border,
                  backgroundColor: editRuleSelectedSubcategory?.id === sub.id ? ui.accentSoft : ui.surface2,
                }
              ]}
            >
              <Pressable
                style={{ paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}
                onPress={() => {
                  setEditRuleSelectedSubcategory(sub);
                  setEditRuleSubcategoryModalOpen(false);
                }}
              >
                <ThemedText style={{ color: editRuleSelectedSubcategory?.id === sub.id ? ui.accent : ui.text, fontWeight: '500' }}>
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
    </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 0.2,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  card: {
    padding: 12,
    borderRadius: 20,
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
  dropdownButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonDisabled: { opacity: 0.5 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    borderRadius: 24,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
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
    borderRadius: 14,
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
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fab: {
    position: "absolute",
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
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
  loader: {
    marginVertical: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  modalHeaderTitle: {
    fontSize: 17,
    flex: 1,
    textAlign: "center",
  },
  modalHeaderLeft: {
    width: 44,
  },
  modalHeaderRight: {
    width: 44,
    alignItems: "flex-end",
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 14.5,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  tabFade: {
    gap: 12,
  },
});
