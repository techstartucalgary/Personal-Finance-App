import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listAccounts } from "@/utils/accounts";
import { addCategory, listCategories } from "@/utils/categories";
import { addExpense, listExpenses } from "@/utils/expenses";

import { useFocusEffect, useRouter } from "expo-router";

export default function HomeScreen() {
  const { session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
    currency: string | null;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(
    null,
  );
  type CategoryRow = {
    id: number;
    category_name: string | null;
  };

  type ExpenseRow = {
    id: string;
    amount: number | null;
    description?: string | null;
    created_at?: string | null;
    account_id?: number | null;
    expense_categoryid?: number | null;
    subcategory_id?: number | null;
  };

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(
    null,
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

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

  const loadAccounts = useCallback(async () => {
    if (!userId) {
      setAccounts([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await listAccounts({ profile_id: userId });
      setAccounts((data as AccountRow[]) ?? []);
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

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

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
      loadCategories();
      loadExpenses();
    }, [loadAccounts, loadCategories, loadExpenses]),
  );

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

  const canCreate = useMemo(() => {
    const parsed = parseFloat(amount);
    return (
      !!userId &&
      !!selectedAccount &&
      !!selectedCategory &&
      Number.isFinite(parsed) &&
      parsed > 0
    );
  }, [userId, selectedAccount, selectedCategory, amount]);

  const createTransaction = useCallback(async () => {
    if (!userId || !selectedAccount) return;

    const parsed = parseFloat(amount.trim());
    const subcategoryParsed = parseInt(subcategoryId.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than 0.");
      return;
    }
    if (!selectedCategory) return;

    setIsLoading(true);

    try {
      await addExpense({
        profile_id: userId,
        account_id: selectedAccount.id,
        amount: parsed,
        description: description.trim().length ? description.trim() : null,
        expense_categoryid: selectedCategory.id,
        subcategory_id: Number.isFinite(subcategoryParsed)
          ? subcategoryParsed
          : null,
        is_recurring: false,
        reccurence_freq: null,
        next_occurence: null,
        end_date: null,
      });

      setAmount("");
      setDescription("");
      setSubcategoryId("");
      await loadExpenses();
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
    subcategoryId,
    selectedCategory,
    description,
    loadExpenses,
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

        <View
          style={[
            styles.card,
            { borderColor: ui.border, backgroundColor: ui.surface2 },
          ]}
        >
          <ThemedText type="defaultSemiBold">Add transaction</ThemedText>

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

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Subcategory ID</ThemedText>
            <TextInput
              value={subcategoryId}
              onChangeText={setSubcategoryId}
              keyboardType="numeric"
              placeholder="Optional"
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

          <Pressable
            onPress={createTransaction}
            disabled={!canCreate || isLoading}
            style={[
              styles.button,
              { borderColor: ui.border, backgroundColor: ui.surface },
              (!canCreate || isLoading) && styles.buttonDisabled,
            ]}
          >
            <ThemedText type="defaultSemiBold">Add transaction</ThemedText>
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            { borderColor: ui.border, backgroundColor: ui.surface2 },
          ]}
        >
          <ThemedText type="defaultSemiBold">Recent transactions</ThemedText>
          {expenses.length === 0 ? (
            <ThemedText>
              {isLoading ? "Loading…" : "No transactions yet."}
            </ThemedText>
          ) : (
            expenses.map((expense) => (
              <View
                key={expense.id}
                style={[
                  styles.row,
                  { borderColor: ui.border, backgroundColor: ui.surface },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">
                    {expense.description ?? "Transaction"}
                  </ThemedText>
                  <ThemedText type="default">
                    {formatDate(expense.created_at)}
                  </ThemedText>
                </View>
                <ThemedText type="defaultSemiBold">
                  {formatMoney(expense.amount ?? 0)}
                </ThemedText>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={accountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: ui.backdrop }]}
          onPress={() => setAccountModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: ui.surface2, borderColor: ui.border },
            ]}
            onPress={() => {}}
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
                    {account.account_type ?? "—"} {account.currency ?? ""}
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
      </Modal>

      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: ui.backdrop }]}
          onPress={() => setCategoryModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: ui.surface2, borderColor: ui.border },
            ]}
            onPress={() => {}}
          >
            <ThemedText type="defaultSemiBold">Select category</ThemedText>

            {categories.length === 0 ? (
              <ThemedText>No categories yet.</ThemedText>
            ) : (
              categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.modalOption,
                    { borderColor: ui.border, backgroundColor: ui.surface },
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
});
