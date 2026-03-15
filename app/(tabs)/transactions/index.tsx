import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "react-native-paper";

import { AddTransactionModal } from "@/components/AddTransactionModal";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { Tokens } from "@/constants/authTokens";
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
import {
  addExpense,
  listExpenses,
} from "@/utils/expenses";
import type { PlaidAccount, PlaidTransaction } from "@/utils/plaid";
import { getPlaidAccounts, getPlaidTransactions } from "@/utils/plaid";
import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRules,
  updateRecurringRule,
} from "@/utils/recurring";

import { useFocusEffect, useNavigation, useRouter } from "expo-router";

export default function HomeScreen() {
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Dynamic tab bar height
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = insets.bottom + 60;
  }
  const fabBottom = Platform.OS === "android" ? tabBarHeight + 35 : tabBarHeight + 5;
  const theme = useTheme();

  const isAndroid = Platform.OS === "android";

  const ui = useMemo(
    () => ({
      surface: isDark ? "#1C1C1E" : "#FFFFFF",
      surface2: isDark ? "#2C2C2E" : "#F2F2F7",
      border: isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)",
      text: isDark ? "#FFFFFF" : "#000000",
      mutedText: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
      backdrop: "rgba(0,0,0,0.45)",
      accent: isDark ? "#8CF2D1" : "#1F6F5B",
      accentSoft: isDark ? "rgba(140,242,209,0.2)" : "rgba(31,111,91,0.12)",
      danger: "#D32F2F",
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
  const [isAndroidSearching, setIsAndroidSearching] = useState(false);

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
      setEditRuleSubcategoryModalOpen(false);
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
      setEditRuleCategoryModalOpen(false);
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
    <>

      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
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

        {/* Native Segmented Control */}
        <SegmentedControl
          values={["Transactions", "Recurring"]}
          selectedIndex={activeTab === "transactions" ? 0 : 1}
          onChange={(event) => {
            const index = event.nativeEvent.selectedSegmentIndex;
            setActiveTab(index === 0 ? "transactions" : "recurrences");
          }}
          tintColor={isAndroid ? theme.colors.background : (isDark ? "#3A3A3C" : "#FFFFFF")}
          backgroundColor={isAndroid ? theme.colors.surface : "transparent"}
          fontStyle={{ color: ui.text, fontWeight: "500" }}
          activeFontStyle={{ color: ui.text, fontWeight: "600" }}
        />

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
                backgroundColor: filterAccountId === null ? (isAndroid ? theme.colors.tertiary : ui.text) : ui.surface2,
                borderColor: ui.border,
              },
            ]}
          >
            <ThemedText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: filterAccountId === null ? (isAndroid ? theme.colors.onTertiary : ui.surface) : ui.text,
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
                    filterAccountId === acct.id ? (isAndroid ? theme.colors.tertiary : ui.text) : ui.surface2,
                  borderColor: ui.border,
                },
              ]}
            >
              <ThemedText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: filterAccountId === acct.id ? (isAndroid ? theme.colors.onTertiary : ui.surface) : ui.text,
                }}
              >
                {acct.account_name ?? "Account"}
              </ThemedText>
            </Pressable>
          ))}
          {plaidAccounts.map((pa) => {
            const chipId = `plaid:${pa.account_id}`;
            const isSelected = filterAccountId === chipId;
            return (
              <Pressable
                key={chipId}
                onPress={() => setFilterAccountId(chipId)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? (isDark ? "#1F6F5B" : "#2A8A6E")
                      : ui.surface2,
                    borderColor: isDark ? "rgba(140,242,209,0.3)" : "rgba(31,111,91,0.2)",
                  },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isSelected ? "#FFFFFF" : (isDark ? "#8CF2D1" : "#1F6F5B"),
                  }}
                >
                  {pa.name}{pa.mask ? ` ••${pa.mask}` : ""}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === "transactions" ? (
          <>


            {expenses.filter((e) => {
              const matchesAccount = filterAccountId === null || e.account_id === filterAccountId;
              const matchesSearch = !searchQuery ||
                (e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  e.amount?.toString().includes(searchQuery));
              return matchesAccount && matchesSearch;
            }).length === 0 ? (
              <ThemedText>
                {isLoading ? "Loading…" : "No transactions found."}
              </ThemedText>
            ) : (
              expenses
                .filter((e) => {
                  const matchesAccount = filterAccountId === null || e.account_id === filterAccountId;
                  const matchesSearch = !searchQuery ||
                    (e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      e.amount?.toString().includes(searchQuery));
                  return matchesAccount && matchesSearch;
                })
                .sort((a, b) => {
                  const dateA = new Date(a.transaction_date || a.created_at || 0).getTime();
                  const dateB = new Date(b.transaction_date || b.created_at || 0).getTime();
                  return dateB - dateA;
                })
                .map((expense) => (
                  <Pressable
                    key={expense.id}
                    onPress={() => {
                      setSelectedDetailTransaction(expense);
                      setIsDetailModalVisible(true);
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        borderColor: ui.border,
                        backgroundColor: ui.surface2,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <ThemedText type="defaultSemiBold">
                          {expense.description ?? "Transaction"}
                        </ThemedText>
                        {expense.recurring_rule_id &&
                          (() => {
                            const linkedRule = recurringRules.find(
                              (r) => r.id === expense.recurring_rule_id,
                            );
                            if (!linkedRule) return null;
                            const color = linkedRule.is_active
                              ? "#FF9500"
                              : ui.mutedText;
                            return (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <IconSymbol
                                  name="arrow.triangle.2.circlepath"
                                  size={12}
                                  color={color}
                                />
                                <ThemedText
                                  style={{
                                    color,
                                    fontSize: 12,
                                    fontWeight: "500",
                                  }}
                                >
                                  {linkedRule.is_active ? "Active" : "Inactive"}
                                </ThemedText>
                              </View>
                            );
                          })()}
                      </View>
                      <ThemedText type="default">
                        {formatDate(expense.transaction_date || expense.created_at)}
                      </ThemedText>
                    </View>
                    <ThemedText type="defaultSemiBold">
                      {formatMoney(expense.amount ?? 0)}
                    </ThemedText>
                  </Pressable>
                ))
            )}

            {/* Plaid Bank Transactions */}
            {plaidTransactions.length > 0 && (filterAccountId === null || (typeof filterAccountId === "string" && filterAccountId.startsWith("plaid:"))) && (
              <>
                {filterAccountId === null && (
                  <View style={{ marginTop: 16, marginBottom: 8 }}>
                    <ThemedText type="defaultSemiBold" style={{ color: ui.mutedText, fontSize: 13, letterSpacing: 0.5 }}>
                      BANK TRANSACTIONS
                    </ThemedText>
                  </View>
                )}
                {plaidTransactions
                  .filter((t) => {
                    let matchesAccount = true;
                    if (filterAccountId !== null) {
                      if (typeof filterAccountId === "string" && filterAccountId.startsWith("plaid:")) {
                        matchesAccount = t.account_id === filterAccountId.replace("plaid:", "");
                      } else {
                        matchesAccount = false;
                      }
                    }
                    const matchesSearch = !searchQuery ||
                      ((t.merchant_name || t.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.amount?.toString().includes(searchQuery));

                    return matchesAccount && matchesSearch;
                  })
                  .sort((a, b) => {
                    const dateA = new Date(a.date || 0).getTime();
                    const dateB = new Date(b.date || 0).getTime();
                    return dateB - dateA;
                  })
                  .map((tx) => (
                    <Pressable
                      key={tx.transaction_id}
                      onPress={() => {
                        setSelectedDetailTransaction(tx);
                        setIsDetailModalVisible(true);
                      }}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          borderColor: isDark ? "rgba(140,242,209,0.2)" : "rgba(31,111,91,0.15)",
                          backgroundColor: ui.surface2,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <ThemedText type="defaultSemiBold">
                            {tx.merchant_name || tx.name}
                          </ThemedText>
                          {tx.pending && (
                            <View style={{
                              backgroundColor: isDark ? "rgba(255,165,0,0.2)" : "rgba(255,165,0,0.15)",
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}>
                              <ThemedText style={{ fontSize: 10, color: "#FF9500", fontWeight: "600" }}>
                                PENDING
                              </ThemedText>
                            </View>
                          )}
                        </View>

                        {tx.institution_name && (
                          <ThemedText style={{
                            fontSize: 10,
                            color: isDark ? "#8CF2D1" : "#1F6F5B",
                            fontWeight: "700",
                            letterSpacing: 0.5,
                            marginTop: 1,
                          }}>
                            {tx.institution_name.toUpperCase()}
                          </ThemedText>
                        )}

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <ThemedText type="default" style={{ color: ui.mutedText, fontSize: 13 }}>
                            {formatDate(tx.date)}
                          </ThemedText>
                          <ThemedText style={{
                            fontSize: 11,
                            color: ui.mutedText,
                            fontWeight: "500",
                          }}>
                            {[
                              tx.account_name,
                              tx.account_mask ? `••${tx.account_mask}` : null,
                            ].filter(Boolean).join(" ")}
                          </ThemedText>
                        </View>
                        {tx.category && tx.category.length > 0 && (
                          <ThemedText style={{ color: ui.mutedText, fontSize: 12, marginTop: 2 }}>
                            {tx.category.join(" › ")}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText type="defaultSemiBold" style={{
                        color: tx.amount > 0
                          ? (isDark ? "#FF6B6B" : "#D32F2F")
                          : (isDark ? "#69F0AE" : "#2E7D32"),
                      }}>
                        {tx.amount > 0 ? "-" : "+"}{formatMoney(Math.abs(tx.amount))}
                      </ThemedText>
                    </Pressable>
                  ))}
              </>
            )}
          </>
        ) : (
          recurringRules
            .filter((r) => {
              const matchesAccount = filterAccountId === null || r.account_id === filterAccountId;
              const matchesSearch = !searchQuery ||
                (r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.amount?.toString().includes(searchQuery));
              return matchesAccount && matchesSearch;
            })
            .sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1))
            .length === 0 ? (
            <ThemedText style={{ padding: 16 }}>
              {isLoading ? "Loading…" : "No recurrences found."}
            </ThemedText>
          ) : (
            recurringRules
              .filter((r) => {
                const matchesAccount = filterAccountId === null || r.account_id === filterAccountId;
                const matchesSearch = !searchQuery ||
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
                  </View>
                </Pressable>
              ))
          )
        )}
      </ScrollView>

      <Pressable
        onPress={() => setAddModalOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          {
            width: 80,
            height: 80,
            borderRadius: 20,
            right: 16,
          },
          {
            backgroundColor: ui.text,
            opacity: pressed ? 0.8 : 1,
            bottom: fabBottom,
            elevation: isAndroid ? 5 : 6,
          },
        ]}
      >
        <IconSymbol name="plus" size={32} color={ui.surface} />
      </Pressable>

      <AddTransactionModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        accounts={accounts}
        categories={categories}
        onRefresh={async () => {
          await loadExpenses();
          await loadAccounts();
          await loadRecurringRules();
        }}
        ui={ui}
        isDark={isDark}
        userId={userId}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={isDetailModalVisible}
        onClose={() => {
          setIsDetailModalVisible(false);
          setSelectedDetailTransaction(null);
        }}
        transaction={selectedDetailTransaction}
        accounts={accounts}
        onEdit={(expense) => {
          setEditingExpense(expense);
        }}
      >
        <EditTransactionModal
          visible={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          expense={editingExpense}
          accounts={accounts}
          categories={categories}
          recurringRules={recurringRules}
          onRefresh={async () => {
            await loadExpenses();
            await loadAccounts();
            await loadRecurringRules();
          }}
          ui={ui}
          isDark={isDark}
          userId={userId}
        />
      </TransactionDetailModal>


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
                style={[styles.modalCloseButton, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)" }]}
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
                  setEditRuleSelectedCategory(cat);
                  setEditRuleSelectedSubcategory(null);
                  setEditRuleCategoryModalOpen(false);
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

      {/* Edit Rule: Subcategory Picker */}
      <SelectionModal
        visible={editRuleSubcategoryModalOpen}
        onClose={() => setEditRuleSubcategoryModalOpen(false)}
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
        {editRuleSubcategories.length === 0 ? (
          <ThemedText style={{ textAlign: "center", padding: 20 }}>No subcategories found.</ThemedText>
        ) : (
          editRuleSubcategories.map((sub) => (
            <View key={sub.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                style={[styles.modalOption, { borderColor: ui.border, backgroundColor: ui.surface, flex: 1 }]}
                onPress={() => {
                  setEditRuleSelectedSubcategory(sub);
                  setEditRuleSubcategoryModalOpen(false);
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
    </>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 20,
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
});
