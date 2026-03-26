import Feather from "@expo/vector-icons/Feather";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { DateTimePickerField } from "./ui/DateTimePickerField";
import { IconSymbol } from "./ui/icon-symbol";
import { SelectionModal } from "./ui/SelectionModal";

import { Tokens } from "@/constants/authTokens";
import { getAccountById, updateAccount } from "@/utils/accounts";
import { addCategory, deleteCategory } from "@/utils/categories";
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

type CategorySuggestion = {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
};

const DEFAULT_CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  { label: "Groceries", icon: "shopping-cart", color: "#2F9E44" },
  { label: "Dining", icon: "coffee", color: "#F08C00" },
  { label: "Health", icon: "activity", color: "#E03131" },
  { label: "Leisure", icon: "sun", color: "#F59F00" },
  { label: "Home", icon: "home", color: "#1971C2" },
  { label: "Utilities", icon: "zap", color: "#15AABF" },
  { label: "Transportation", icon: "truck", color: "#4C6EF5" },
  { label: "Shopping", icon: "shopping-bag", color: "#E8590C" },
  { label: "Entertainment", icon: "film", color: "#845EF7" },
  { label: "Travel", icon: "map-pin", color: "#F06595" },
];

const QUICK_PICK_SUGGESTIONS = DEFAULT_CATEGORY_SUGGESTIONS.slice(0, 3);
const ICON_CHOICES = DEFAULT_CATEGORY_SUGGESTIONS;

type CategoryPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  ui: any;
  suggestedCategories: CategorySuggestion[];
  categories: CategoryRow[];
  selectedCategoryId: number | null;
  resolveCategoryIcon: (category: CategoryRow) => CategorySuggestion | null;
  onSelectCategory: (category: CategoryRow) => void;
  onDeleteCategory: (categoryId: number) => void;
  onPickSuggested: (label: string) => void;
  onOpenCreate: () => void;
  cardStyle?: StyleProp<ViewStyle>;
};

function CategoryPickerModal({
  visible,
  onClose,
  ui,
  suggestedCategories,
  categories,
  selectedCategoryId,
  resolveCategoryIcon,
  onSelectCategory,
  onDeleteCategory,
  onPickSuggested,
  onOpenCreate,
  cardStyle,
}: CategoryPickerModalProps) {
  const fallbackIcon = "tag" as const;
  const fallbackColor = ui.accent ?? "#4C6EF5";
  const combinedOptions = [
    ...suggestedCategories.map((item) => ({
      type: "suggested" as const,
      key: `suggested:${item.label}`,
      label: item.label,
      icon: item.icon,
      color: item.color,
    })),
    ...categories.map((cat) => {
      const resolved = resolveCategoryIcon(cat);
      return {
        type: "category" as const,
        key: `category:${cat.id}`,
        id: cat.id,
        label: cat.category_name ?? "Unnamed",
        icon: resolved?.icon ?? fallbackIcon,
        color: resolved?.color ?? fallbackColor,
      };
    }),
    {
      type: "add" as const,
      key: "add:new",
      label: "New",
      icon: "plus" as const,
      color: ui.surface2,
    },
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.popupOverlay}>
        <Pressable
          style={[
            styles.popupBackdrop,
            { backgroundColor: ui.backdrop ?? "rgba(0,0,0,0.35)" },
          ]}
          onPress={onClose}
        />
        <View
          style={[styles.popupCard, { backgroundColor: ui.surface, borderColor: ui.border }]}
        >
          <View style={styles.popupHeader}>
            <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
              Select Category
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.popupClose, { backgroundColor: ui.surface2 }]}
            >
              <Feather name="x" size={16} color={ui.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.popupList}
            contentContainerStyle={styles.popupListContent}
            showsVerticalScrollIndicator={false}
          >
            {combinedOptions.length === 0 ? (
              <ThemedText style={{ textAlign: "center", padding: 20, color: ui.mutedText }}>
                No categories yet.
              </ThemedText>
            ) : (
              <View style={styles.categoryGrid}>
                {combinedOptions.map((item) => {
                  const isSelected =
                    item.type === "category" && selectedCategoryId === item.id;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        if (item.type === "suggested") {
                          onPickSuggested(item.label);
                          return;
                        }
                        if (item.type === "add") {
                          onOpenCreate();
                          return;
                        }
                        const match = categories.find((cat) => cat.id === item.id);
                        if (match) onSelectCategory(match);
                      }}
                      onLongPress={() => {
                        if (item.type === "category") onDeleteCategory(item.id);
                      }}
                      style={({ pressed }) => [
                        styles.quickPickItem,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <View
                        style={[
                        styles.quickPickIcon,
                        {
                          backgroundColor:
                            item.type === "add" ? ui.surface2 : item.color,
                          borderColor: isSelected ? (ui.accent ?? ui.text) : "transparent",
                          borderWidth: isSelected ? 2 : 0,
                        },
                      ]}
                    >
                      <Feather
                        name={item.icon}
                        size={22}
                        color={item.type === "add" ? ui.mutedText : "#FFFFFF"}
                      />
                    </View>
                      <ThemedText
                        numberOfLines={1}
                        style={[
                          styles.quickPickText,
                          { color: isSelected ? (ui.accent ?? ui.text) : ui.text },
                        ]}
                      >
                        {item.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

type CreateCategoryModalProps = {
  visible: boolean;
  onClose: () => void;
  ui: any;
  iconChoices: CategorySuggestion[];
  newCategoryIcon: CategorySuggestion;
  onSelectNewCategoryIcon: (icon: CategorySuggestion) => void;
  newCategoryName: string;
  onChangeNewCategoryName: (value: string) => void;
  onCreateCategory: () => void;
};

function CreateCategoryModal({
  visible,
  onClose,
  ui,
  iconChoices,
  newCategoryIcon,
  onSelectNewCategoryIcon,
  newCategoryName,
  onChangeNewCategoryName,
  onCreateCategory,
}: CreateCategoryModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.popupOverlay}>
        <Pressable
          style={[
            styles.popupBackdrop,
            { backgroundColor: ui.backdrop ?? "rgba(0,0,0,0.35)" },
          ]}
          onPress={onClose}
        />
        <View
          style={[styles.popupCard, { backgroundColor: ui.surface, borderColor: ui.border }]}
        >
          <View style={styles.popupHeader}>
            <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
              New Category
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.popupClose, { backgroundColor: ui.surface2 }]}
            >
              <Feather name="x" size={16} color={ui.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.popupList}
            contentContainerStyle={styles.popupListContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconPickerWrap}>
              <View style={styles.iconPickerRow}>
                {iconChoices.map((icon) => {
                  const isActive = icon.icon === newCategoryIcon.icon;
                  return (
                    <Pressable
                      key={icon.label}
                      onPress={() => onSelectNewCategoryIcon(icon)}
                      style={({ pressed }) => [
                        styles.iconPickerItem,
                        {
                          backgroundColor: icon.color,
                          borderColor: isActive ? (ui.accent ?? ui.text) : "transparent",
                          borderWidth: isActive ? 2 : 0,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Feather name={icon.icon} size={18} color="#FFFFFF" />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.popupFooter, { borderTopColor: ui.border }]}>
            <View style={styles.footerRow}>
              <TextInput
                value={newCategoryName}
                onChangeText={onChangeNewCategoryName}
                placeholder="New category name"
                placeholderTextColor={ui.mutedText}
                style={[
                  styles.footerInput,
                  { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text },
                ]}
              />
              <Pressable
                onPress={onCreateCategory}
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
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
  const togglePadding = 2;
  const keyboardShift = React.useRef(new Animated.Value(0)).current;

  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    toLocalISOString(new Date()),
  );
  // TODO(backend): Persist transaction_type once schema supports Expense/Income/Transfer.
  const [transactionType, setTransactionType] = useState<
    "expense" | "income" | "transfer"
  >("expense");
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(
    null,
  );

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("Monthly");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [addRuleEndsOn, setAddRuleEndsOn] = useState("");
  const [addRuleNextRunDate, setAddRuleNextRunDate] = useState("");

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const [addFrequencyModalOpen, setAddFrequencyModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<CategorySuggestion>(
    ICON_CHOICES[0],
  );
  const [categoryIconOverrides, setCategoryIconOverrides] = useState<
    Record<number, CategorySuggestion>
  >({});
  // TODO(backend): Persist notes/labels once supported.
  const [notes, setNotes] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [toggleWidth, setToggleWidth] = useState(0);
  const toggleTranslate = React.useRef(new Animated.Value(0)).current;
  const toggleOptions = ["income", "expense", "transfer"] as const;

  const suggestedCategories = useMemo(() => {
    const existing = new Set(
      categories
        .map((cat) => (cat.category_name ?? "").trim().toLowerCase())
        .filter(Boolean),
    );
    return DEFAULT_CATEGORY_SUGGESTIONS.filter(
      (item) => !existing.has(item.label.toLowerCase()),
    );
  }, [categories]);

  const resolveCategoryIcon = useCallback(
    (category: CategoryRow) => {
      const override = categoryIconOverrides[category.id];
      if (override) return override;
      const match = DEFAULT_CATEGORY_SUGGESTIONS.find(
        (item) => item.label.toLowerCase() === (category.category_name ?? "").trim().toLowerCase(),
      );
      return match ?? null;
    },
    [categoryIconOverrides],
  );

  const getAccountColor = useCallback(
    (account: AccountRow, fallbackIndex: number) => {
      const type = (account.account_type ?? "").toLowerCase();
      const isDebit =
        type === "debit" ||
        type === "depository" ||
        type === "checking" ||
        type === "savings";
      const palette = isDebit
        ? ["#701D26", "#8A2431", "#5A1520", "#9B2B3A"]
        : ["#D86666", "#E07A7A", "#C95454", "#E39191"];
      const index = accounts.findIndex((item) => item.id === account.id);
      const resolvedIndex = index >= 0 ? index : fallbackIndex;
      return palette[resolvedIndex % palette.length];
    },
    [accounts],
  );

  const getReadableAccent = useCallback(
    (hex: string) => {
      const normalized = hex.replace("#", "");
      if (normalized.length !== 3 && normalized.length !== 6) return hex;
      const full =
        normalized.length === 3
          ? normalized
              .split("")
              .map((char) => `${char}${char}`)
              .join("")
          : normalized;
      const num = parseInt(full, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      const amount = isDark ? 0.35 : -0.35;
      const shift = (value: number) =>
        Math.min(255, Math.max(0, Math.round(value + 255 * amount)));
      const next = (shift(r) << 16) | (shift(g) << 8) | shift(b);
      return `#${next.toString(16).padStart(6, "0")}`;
    },
    [isDark],
  );
  const orderedAccounts = useMemo(() => {
    const source = accounts ?? [];
    return [...source].sort((a, b) => {
      if (selectedAccount?.id === a.id) return -1;
      if (selectedAccount?.id === b.id) return 1;
      return (a.account_name ?? "").localeCompare(b.account_name ?? "");
    });
  }, [accounts, selectedAccount?.id]);

  const handleSuggestedCategory = useCallback(
    async (label: string) => {
      if (!userId) return;
      const existing = categories.find(
        (cat) =>
          (cat.category_name ?? "").trim().toLowerCase() ===
          label.toLowerCase(),
      );
      if (existing) {
        setSelectedCategory(existing);
        setCategoryModalOpen(false);
        return;
      }
      try {
        const data = await addCategory({
          profile_id: userId,
          category_name: label,
        });
        const match = DEFAULT_CATEGORY_SUGGESTIONS.find(
          (item) => item.label.toLowerCase() === label.toLowerCase(),
        );
        if (match) {
          setCategoryIconOverrides((prev) => ({
            ...prev,
            [data.id]: match,
          }));
        }
        setSelectedCategory(data as CategoryRow);
        setCategoryModalOpen(false);
        await onRefresh();
      } catch (error) {
        console.error("Error creating category:", error);
        Alert.alert("Could not create category", "Please try again.");
      }
    },
    [categories, onRefresh, userId, setCategoryIconOverrides],
  );

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setAmount("");
      setDescription("");
      setNotes("");
      setNotesModalOpen(false);
      setTransactionDate(toLocalISOString(new Date()));
      setTransactionType("expense");
      setSelectedAccount(null);
      setSelectedCategory(null);
      setIsRecurring(false);
      setRecurringFrequency("Monthly");
      setHasEndDate(false);
      setAddRuleEndsOn("");
      setAddRuleNextRunDate("");
      setNewCategoryIcon(ICON_CHOICES[0]);
      setCreateCategoryModalOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (!selectedAccount && accounts.length === 1) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount, visible]);

  useEffect(() => {
    if (!visible) return;
    if (!selectedCategory && categories.length === 1) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory, visible]);

  // Recalculate default Next Run Date when Frequency or IsRecurring changes
  useEffect(() => {
    if (isRecurring) {
      const nextDate = new Date();
      if (recurringFrequency === "Daily")
        nextDate.setDate(nextDate.getDate() + 1);
      else if (recurringFrequency === "Weekly")
        nextDate.setDate(nextDate.getDate() + 7);
      else if (recurringFrequency === "Monthly")
        nextDate.setMonth(nextDate.getMonth() + 1);
      else if (recurringFrequency === "Yearly")
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      setAddRuleNextRunDate(toLocalISOString(nextDate));
    } else {
      setAddRuleNextRunDate("");
    }
  }, [isRecurring, recurringFrequency]);

  // TODO(backend): Allow transfer flow once accounts-to-accounts transfers are supported.
  const canCreate = useMemo(() => {
    const parsed = parseFloat(amount);
    return (
      !!userId &&
      !!selectedAccount &&
      !!selectedCategory &&
      transactionType !== "transfer" &&
      description.trim().length > 0 &&
      Number.isFinite(parsed) &&
      parsed > 0
    );
  }, [
    userId,
    selectedAccount,
    selectedCategory,
    amount,
    description,
    transactionType,
  ]);

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
          if (recurringFrequency === "Daily")
            fallbackDate.setDate(fallbackDate.getDate() + 1);
          else if (recurringFrequency === "Weekly")
            fallbackDate.setDate(fallbackDate.getDate() + 7);
          else if (recurringFrequency === "Monthly")
            fallbackDate.setMonth(fallbackDate.getMonth() + 1);
          else if (recurringFrequency === "Yearly")
            fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
          finalNextRunDate = toLocalISOString(fallbackDate);
        }

        const ruleName =
          description.trim() || `${selectedCategory.category_name} expense`;
        const rule = await createRecurringRule({
          profile_id: userId,
          name: ruleName,
          amount: parsed,
          frequency: recurringFrequency,
          end_date:
            isRecurring && hasEndDate && addRuleEndsOn.trim()
              ? addRuleEndsOn.trim()
              : null,
          next_run_date: finalNextRunDate,
          is_active: true,
          account_id: selectedAccount.id,
          expense_categoryid: selectedCategory.id,
          subcategory_id: null,
        });
        recurring_rule_id = rule.id;
      }

      // TODO(backend): Replace signed-amount convention with explicit type field if desired.
      const signedAmount = parsed * (transactionType === "income" ? -1 : 1);

      // TODO(backend): This currently writes to the expenses table for both Expense and Income.
      await addExpense({
        profile_id: userId,
        account_id: selectedAccount.id,
        amount: signedAmount,
        description: description.trim().length ? description.trim() : null,
        expense_categoryid: selectedCategory.id,
        subcategory_id: null,
        transaction_date: transactionDate || toLocalISOString(new Date()),
        recurring_rule_id,
      });

      const latestAccount = await getAccountById({
        id: selectedAccount.id,
        profile_id: userId,
      });
      const balanceSource = latestAccount ? latestAccount : selectedAccount;
      const currentBalance = balanceSource.balance ? balanceSource.balance : 0;
      const isCredit = balanceSource.account_type === "credit";
      // TODO(backend): If backend adds transfer routing, update both source and destination balances here.
      const nextBalance = isCredit
        ? currentBalance + signedAmount
        : currentBalance - signedAmount;

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
        setCategoryIconOverrides((prev) => ({
          ...prev,
          [data.id]: newCategoryIcon,
        }));
        setNewCategoryIcon(ICON_CHOICES[0]);
        setSelectedCategory(data as CategoryRow);
        setCreateCategoryModalOpen(false);
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
      "Transactions using this category will be preserved but uncategorized.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory({ id: categoryId, profile_id: userId });
              await onRefresh();
              setCategoryIconOverrides((prev) => {
                if (!(categoryId in prev)) return prev;
                const next = { ...prev };
                delete next[categoryId];
                return next;
              });
              if (selectedCategory?.id === categoryId) {
                setSelectedCategory(null);
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

  const handleTypeChange = useCallback(
    (next: "expense" | "income" | "transfer") => {
      setTransactionType(next);
    },
    [],
  );

  useEffect(() => {
    if (!toggleWidth) return;
    const index = Math.max(0, toggleOptions.indexOf(transactionType));
    const innerWidth = Math.max(toggleWidth - togglePadding * 2, 0);
    const segmentWidth = innerWidth / 3;
    Animated.spring(toggleTranslate, {
      toValue: segmentWidth * index,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [toggleTranslate, toggleWidth, transactionType, togglePadding]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = Math.max(
        (event.endCoordinates?.height ? event.endCoordinates?.height : 0) -
          insets.bottom,
        0,
      );
      Animated.timing(keyboardShift, {
        toValue: -height,
        duration: Platform.OS === "ios" ? 220 : 180,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardShift, {
        toValue: 0,
        duration: Platform.OS === "ios" ? 200 : 160,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardShift, insets.bottom]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView
        style={{ flex: 1, backgroundColor: ui.bg ? ui.bg : ui.surface }}
      >
        <View style={{ flex: 1, backgroundColor: ui.bg ? ui.bg : ui.surface }}>
          <View
            style={[
              styles.modalHeader,
              { paddingTop: Platform.OS === "ios" ? 20 : insets.top + 12 },
            ]}
          >
            <View style={styles.headerSpacer} />
            <ThemedText
              type="defaultSemiBold"
              style={[styles.modalHeaderTitle, { color: ui.text }]}
            >
              Add Transaction
            </ThemedText>
            <View style={styles.headerRight}>
              <Pressable
                onPress={onClose}
                hitSlop={20}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(0,0,0,0.05)",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="x" size={18} color={ui.text} />
              </Pressable>
            </View>
          </View>
          <Animated.View
            style={{ flex: 1, transform: [{ translateY: keyboardShift }] }}
          >
            <ScrollView
              style={{ flex: 1, backgroundColor: ui.bg ? ui.bg : ui.surface }}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 24 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={styles.formStack}>
                <View style={styles.heroBlock}>
                  <Pressable
                    onPress={() => amountInputRef.current?.focus()}
                    style={[
                      styles.amountContainer,
                      { backgroundColor: ui.surface, borderColor: ui.border },
                    ]}
                  >
                    <ThemedText
                      style={[styles.currencySymbol, { color: ui.text }]}
                    >
                      $
                    </ThemedText>
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
                      placeholderTextColor={ui.mutedText}
                      style={[styles.amountInput, { color: ui.text }]}
                    />
                  </Pressable>

                  <View
                    style={[
                      styles.typeToggle,
                      { backgroundColor: ui.surface2, borderColor: ui.border },
                    ]}
                    onLayout={(event) => {
                      const width = event.nativeEvent.layout.width;
                      setToggleWidth(width);
                    }}
                  >
                    {toggleWidth > 0 && (
                      <Animated.View
                        style={[
                          styles.typeToggleActive,
                          {
                            width: (toggleWidth - togglePadding * 2) / 3,
                            backgroundColor: ui.text,
                            transform: [{ translateX: toggleTranslate }],
                            left: togglePadding,
                          },
                        ]}
                        pointerEvents="none"
                      />
                    )}
                    {toggleOptions.map((type) => {
                      const isActive = transactionType === type;
                      const label =
                        type.charAt(0).toUpperCase() + type.slice(1);
                      return (
                        <Pressable
                          key={type}
                          onPress={() => handleTypeChange(type)}
                          style={styles.typeToggleItem}
                        >
                          <ThemedText
                            style={{
                              color: isActive ? ui.surface : ui.text,
                              fontWeight: isActive ? "700" : "600",
                            }}
                          >
                            {label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {transactionType === "transfer" && (
                    <ThemedText
                      style={[styles.helperText, { color: ui.mutedText }]}
                    >
                      Transfers are coming soon. Choose Expense or Income to
                      continue.
                    </ThemedText>
                  )}
                </View>

                <View
                  style={[
                    styles.groupCard,
                    { backgroundColor: ui.surface, borderColor: ui.border },
                  ]}
                >
                  <View style={styles.inputRow}>
                    <View style={styles.rowLeft}>
                      <Feather
                        name="shopping-bag"
                        size={18}
                        color={ui.mutedText}
                      />
                      <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                        Merchant
                      </ThemedText>
                    </View>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Name"
                      placeholderTextColor={ui.mutedText}
                      style={[styles.rowInputRight, { color: ui.text }]}
                    />
                  </View>

                  <View
                    style={[
                      styles.rowSeparator,
                      { backgroundColor: ui.border },
                    ]}
                  />

                  <Pressable
                    onPress={() => setAccountModalOpen(true)}
                    style={styles.inputRow}
                  >
                    <View style={styles.rowLeft}>
                      <Feather
                        name="credit-card"
                        size={18}
                        color={ui.mutedText}
                      />
                      <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                        Account
                      </ThemedText>
                    </View>
                    <View style={styles.rowRight}>
                      <ThemedText
                        style={[
                          styles.rowValueRight,
                          !selectedAccount && { color: ui.mutedText },
                        ]}
                      >
                        {selectedAccount?.account_name ?? "Select"}
                      </ThemedText>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={ui.mutedText}
                      />
                    </View>
                  </Pressable>

                  <View
                    style={[
                      styles.rowSeparator,
                      { backgroundColor: ui.border },
                    ]}
                  />

                  <DateTimePickerField
                    label="Date"
                    value={parseLocalDate(transactionDate)}
                    onChange={(date) =>
                      setTransactionDate(toLocalISOString(date))
                    }
                    ui={ui}
                    icon="calendar"
                  />
                </View>

                <View
                  style={[
                    styles.groupCard,
                    {
                      backgroundColor: ui.surface,
                      borderColor: ui.border,
                      marginTop: 12,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setCategoryModalOpen(true)}
                    style={styles.inputRow}
                  >
                    <View style={styles.rowLeft}>
                      <Feather name="tag" size={18} color={ui.mutedText} />
                      <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                        Category
                      </ThemedText>
                    </View>
                    <View style={styles.rowRight}>
                      <ThemedText
                        style={[
                          styles.rowValueRight,
                          !selectedCategory && { color: ui.mutedText },
                        ]}
                      >
                        {selectedCategory?.category_name ?? "Select"}
                      </ThemedText>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={ui.mutedText}
                      />
                    </View>
                  </Pressable>

                  <View style={styles.quickPickWrap}>
                    <ThemedText
                      style={[styles.quickPickLabel, { color: ui.mutedText }]}
                    >
                      Quick picks
                    </ThemedText>
                    <View style={styles.quickPickRow}>
                      {QUICK_PICK_SUGGESTIONS.map((item) => {
                        const isSelected =
                          (selectedCategory?.category_name ?? "")
                            .trim()
                            .toLowerCase() === item.label.toLowerCase();
                        return (
                          <Pressable
                            key={item.label}
                            onPress={() => handleSuggestedCategory(item.label)}
                            style={({ pressed }) => [
                              styles.quickPickItem,
                              { opacity: pressed ? 0.7 : 1 },
                            ]}
                          >
                            <View
                              style={[
                                styles.quickPickIcon,
                                {
                                  backgroundColor: item.color,
                                  borderWidth: isSelected ? 2 : 0,
                                  borderColor: isSelected
                                    ? (ui.accent ?? ui.text)
                                    : "transparent",
                                },
                              ]}
                            >
                              <Feather
                                name={item.icon}
                                size={22}
                                color="#FFFFFF"
                              />
                            </View>
                            <ThemedText
                              style={[styles.quickPickText, { color: ui.text }]}
                            >
                              {item.label}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                      <Pressable
                        onPress={() => setCategoryModalOpen(true)}
                        style={({ pressed }) => [
                          styles.quickPickItem,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <View
                          style={[
                            styles.quickPickIcon,
                            styles.quickPickMoreIcon,
                            {
                              backgroundColor: ui.surface2,
                              borderColor: ui.border,
                            },
                          ]}
                        >
                          <Feather name="plus" size={22} color={ui.mutedText} />
                        </View>
                        <ThemedText
                          style={[
                            styles.quickPickText,
                            { color: ui.mutedText },
                          ]}
                        >
                          More
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.rowSeparator,
                      { backgroundColor: ui.border },
                    ]}
                  />

                  <Pressable
                    onPress={() => setAddFrequencyModalOpen(true)}
                    style={styles.inputRow}
                  >
                    <View style={styles.rowLeft}>
                      <Feather name="repeat" size={18} color={ui.mutedText} />
                      <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                        Recurrence
                      </ThemedText>
                    </View>
                    <View style={styles.rowRight}>
                      <ThemedText
                        style={[styles.rowValueRight, { color: ui.mutedText }]}
                      >
                        {isRecurring ? recurringFrequency : "Once"}
                      </ThemedText>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={ui.mutedText}
                      />
                    </View>
                  </Pressable>

                  <View
                    style={[
                      styles.rowSeparator,
                      { backgroundColor: ui.border },
                    ]}
                  />

                  <View style={styles.notesRow}>
                    <View style={styles.rowLeft}>
                      <Feather name="edit-3" size={18} color={ui.mutedText} />
                      <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                        Notes and Labels
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.notesField,
                        { backgroundColor: ui.surface },
                      ]}
                    >
                      <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Type here"
                        placeholderTextColor={ui.mutedText}
                        multiline
                        textAlignVertical="top"
                        style={[styles.notesInput, { color: ui.text }]}
                      />
                      <Pressable
                        style={styles.notesExpand}
                        hitSlop={8}
                        onPress={() => setNotesModalOpen(true)}
                      >
                        <Feather
                          name="maximize-2"
                          size={18}
                          color={ui.mutedText}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {isRecurring && (
                    <>
                      <View
                        style={[
                          styles.rowSeparator,
                          { backgroundColor: ui.border },
                        ]}
                      />
                      <DateTimePickerField
                        label="Next Run"
                        value={parseLocalDate(addRuleNextRunDate)}
                        onChange={(date) =>
                          setAddRuleNextRunDate(toLocalISOString(date))
                        }
                        ui={ui}
                        icon="calendar.badge.clock"
                      />

                      <View
                        style={[
                          styles.rowSeparator,
                          { backgroundColor: ui.border },
                        ]}
                      />
                      <View style={styles.inputRow}>
                        <Feather
                          name="calendar"
                          size={18}
                          color={ui.mutedText}
                        />
                        <ThemedText style={styles.rowLabelInline}>
                          Ends
                        </ThemedText>
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
                          <View
                            style={[
                              styles.rowSeparator,
                              { backgroundColor: ui.border },
                            ]}
                          />
                          <DateTimePickerField
                            label="Ends On"
                            value={parseLocalDate(addRuleEndsOn)}
                            onChange={(date) =>
                              setAddRuleEndsOn(toLocalISOString(date))
                            }
                            ui={ui}
                            icon="calendar"
                            placeholder="Select Date"
                          />
                        </>
                      )}
                    </>
                  )}
                </View>
                <View style={styles.footerStack}>
                  <Pressable
                    onPress={createTransaction}
                    disabled={!canCreate || isLoading}
                    style={({ pressed }) => [
                      styles.button,
                      {
                        backgroundColor: isDark ? "#FFFFFF" : "#000000",
                        borderColor: ui.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                      (!canCreate || isLoading) && styles.buttonDisabled,
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator
                        color={isDark ? "#1C1C1E" : "#FFFFFF"}
                      />
                    ) : (
                      <ThemedText
                        type="defaultSemiBold"
                        style={{ color: isDark ? "#1C1C1E" : "#FFFFFF" }}
                      >
                        Submit
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>

        {/* Frequency Picker */}
        <SelectionModal
          visible={addFrequencyModalOpen}
          onClose={() => setAddFrequencyModalOpen(false)}
          title="Select Frequency"
          ui={ui}
        >
          {["Once", "Daily", "Weekly", "Monthly", "Yearly"].map((freq) => (
            <Pressable
              key={freq}
              style={({ pressed }) => [
                styles.modalOption,
                {
                  borderColor: ui.border,
                  backgroundColor:
                    freq === "Once"
                      ? !isRecurring
                        ? ui.accentSoft
                        : ui.surface2
                      : recurringFrequency === freq
                        ? ui.accentSoft
                        : ui.surface2,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => {
                if (freq === "Once") {
                  setIsRecurring(false);
                  setAddFrequencyModalOpen(false);
                  return;
                }
                setIsRecurring(true);
                setRecurringFrequency(freq);
                setAddFrequencyModalOpen(false);
              }}
            >
              <ThemedText
                style={{
                  color:
                    freq === "Once"
                      ? !isRecurring
                        ? ui.accent
                        : ui.text
                      : recurringFrequency === freq
                        ? ui.accent
                        : ui.text,
                }}
              >
                {freq}
              </ThemedText>
              {(freq === "Once"
                ? !isRecurring
                : recurringFrequency === freq) && (
                <IconSymbol name="checkmark" size={18} color={ui.accent} />
              )}
            </Pressable>
          ))}
        </SelectionModal>

        {/* Account Picker */}
        <Modal
          visible={accountModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAccountModalOpen(false)}
        >
          <View style={styles.popupOverlay}>
            <Pressable
              style={[
                styles.popupBackdrop,
                {
                  backgroundColor: ui.backdrop
                    ? ui.backdrop
                    : "rgba(0,0,0,0.35)",
                },
              ]}
              onPress={() => setAccountModalOpen(false)}
            />
            <View
              style={[
                styles.popupCard,
                { backgroundColor: ui.surface, borderColor: ui.border },
              ]}
            >
              <View style={styles.popupHeader}>
                <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
                  Select Account
                </ThemedText>
                <Pressable
                  onPress={() => setAccountModalOpen(false)}
                  hitSlop={12}
                  style={[styles.popupClose, { backgroundColor: ui.surface2 }]}
                >
                  <Feather name="x" size={16} color={ui.text} />
                </Pressable>
              </View>

              <ThemedText
                style={[styles.modalSectionLabel, { color: ui.mutedText }]}
              >
                {orderedAccounts.length} account
                {orderedAccounts.length === 1 ? "" : "s"}
              </ThemedText>

              {accounts.length === 0 ? (
                <ThemedText
                  style={{
                    textAlign: "center",
                    padding: 20,
                    color: ui.mutedText,
                  }}
                >
                  {isLoading ? "Loading..." : "No accounts yet."}
                </ThemedText>
              ) : (
                <View style={styles.accountPillWrap}>
                  {orderedAccounts.map((account, index) => {
                    const accent = getAccountColor(account, index);
                    const accentText = getReadableAccent(accent);
                    const isSelected = selectedAccount?.id === account.id;
                    return (
                      <Pressable
                        key={account.id}
                        style={({ pressed }) => [
                          styles.accountPill,
                          {
                            borderColor: isSelected ? accentText : ui.border,
                            backgroundColor: isSelected
                              ? `${accent}22`
                              : ui.surface2,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                        onPress={() => {
                          setSelectedAccount(account);
                          setAccountModalOpen(false);
                        }}
                      >
                        <View
                          style={[
                            styles.accountDot,
                            { backgroundColor: accent },
                          ]}
                        />
                        <ThemedText
                          numberOfLines={1}
                          style={[
                            styles.accountPillText,
                            { color: isSelected ? accentText : ui.text },
                          ]}
                        >
                          {account.account_name ?? "Unnamed account"}
                        </ThemedText>
                        {isSelected && (
                          <Feather name="check" size={14} color={accentText} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </Modal>

        <CategoryPickerModal
          visible={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
          ui={ui}
          suggestedCategories={suggestedCategories}
          categories={categories}
          selectedCategoryId={selectedCategory?.id ?? null}
          resolveCategoryIcon={resolveCategoryIcon}
          cardStyle={styles.popupCardFull}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setCategoryModalOpen(false);
          }}
          onDeleteCategory={handleDeleteCategory}
          onPickSuggested={handleSuggestedCategory}
          onOpenCreate={() => {
            setCategoryModalOpen(false);
            setCreateCategoryModalOpen(true);
          }}
        />
        <CreateCategoryModal
          visible={createCategoryModalOpen}
          onClose={() => setCreateCategoryModalOpen(false)}
          ui={ui}
          iconChoices={ICON_CHOICES}
          newCategoryIcon={newCategoryIcon}
          onSelectNewCategoryIcon={setNewCategoryIcon}
          newCategoryName={newCategoryName}
          onChangeNewCategoryName={setNewCategoryName}
          onCreateCategory={createCategory}
        />

        {/* Notes Fullscreen Editor */}
        <Modal
          visible={notesModalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setNotesModalOpen(false)}
        >
          <ThemedView
            style={{
              flex: 1,
              backgroundColor: ui.bg ? ui.bg : ui.surface,
              paddingTop: Platform.OS === "ios" ? 16 : insets.top + 12,
              paddingBottom: insets.bottom + 16,
            }}
          >
            <View style={styles.modalHeader}>
              <View style={styles.headerSpacer} />
              <ThemedText
                type="defaultSemiBold"
                style={[styles.modalHeaderTitle, { color: ui.text }]}
              >
                Notes & Labels
              </ThemedText>
              <View style={styles.headerRight}>
                <Pressable
                  onPress={() => setNotesModalOpen(false)}
                  hitSlop={20}
                  style={[styles.closeButton, { backgroundColor: ui.surface2 }]}
                >
                  <Feather name="x" size={18} color={ui.text} />
                </Pressable>
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, flex: 1 }}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Type here"
                placeholderTextColor={ui.mutedText}
                multiline
                textAlignVertical="top"
                style={[
                  styles.notesModalInput,
                  { color: ui.text, backgroundColor: ui.surface },
                ]}
              />
            </View>
          </ThemedView>
        </Modal>
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
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Tokens.font.semiFamily
      ? Tokens.font.semiFamily
      : Tokens.font.family,
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
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currencySymbol: {
    fontSize: 60,
    fontWeight: "300",
    marginRight: 4,
    lineHeight: 68,
    paddingVertical: 8,
    includeFontPadding: false,
    fontFamily: "Lato-Light",
  },
  amountInput: {
    fontSize: 60,
    fontWeight: "300",
    lineHeight: 68,
    paddingVertical: 8,
    fontFamily: "Lato-Light",
  },
  heroBlock: {
    gap: 10,
    marginBottom: 10,
  },
  typeToggle: {
    position: "relative",
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
  },
  typeToggleActive: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: 16,
  },
  typeToggleItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: Tokens.font.semiFamily
      ? Tokens.font.semiFamily
      : Tokens.font.family,
    letterSpacing: 0.3,
  },
  groupCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: Tokens.font.boldFamily
      ? Tokens.font.semiFamily
      : Tokens.font.family,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowLabelInline: {
    flex: 1,
    fontSize: 15,
    fontFamily: Tokens.font.boldFamily
      ? Tokens.font.semiFamily
      : Tokens.font.family,
  },
  rowValue: {
    fontSize: 15,
    fontFamily: Tokens.font.family,
  },
  rowValueRight: {
    fontSize: 15,
    fontFamily: Tokens.font.family,
    textAlign: "right",
  },
  rowInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    fontFamily: Tokens.font.family,
  },
  rowInputRight: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    textAlign: "right",
    fontFamily: Tokens.font.family,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  rowTextBlock: {
    flex: 1,
    gap: 2,
  },
  notesRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  notesField: {
    position: "relative",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesInput: {
    minHeight: 54,
    paddingRight: 28,
    fontSize: 14,
    fontFamily: Tokens.font.family,
  },
  notesExpand: {
    position: "absolute",
    right: 10,
    bottom: 10,
  },
  notesModalInput: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Tokens.font.family,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    fontFamily: Tokens.font.family,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexGrow: 1,
  },
  formStack: {
    gap: 12,
  },
  footerStack: {
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: 16,
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
  popupOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  popupCard: {
    width: "92%",
    height: "78%",
    maxHeight: "78%",
    minHeight: 320,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  popupCardFull: {
    height: "92%",
    maxHeight: "92%",
  },
  popupClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  popupList: {
    flex: 1,
    minHeight: 0,
  },
  popupListContent: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 6,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.family,
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  accountPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    alignContent: "flex-start",
    width: "100%",
    gap: 10,
    paddingBottom: 6,
  },
  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
  },
  accountDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accountPillText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14.5,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 8,
  },
  popupFooter: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconPickerWrap: {
    gap: 8,
    marginBottom: 10,
  },
  iconPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 12,
  },
  iconPickerItem: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  quickPickWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  quickPickLabel: {
    fontSize: 12,
    fontFamily: Tokens.font.semiFamily,
    letterSpacing: 0.4,
  },
  quickPickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 4,
  },
  quickPickItem: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  quickPickIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  quickPickMoreIcon: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickPickText: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: Tokens.font.family,
  },
});

