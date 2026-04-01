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

import { Tokens } from "@/constants/authTokens";
import { getAccountById, updateAccount } from "@/utils/accounts";
import {
  addCategory,
  addSubcategory,
  deleteCategory,
  deleteSubcategory,
  listSubcategories,
} from "@/utils/categories";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { addExpense, updateExpense } from "@/utils/expenses";
import {
  createRecurringRule,
  deleteRecurringRule,
  updateRecurringRule,
} from "@/utils/recurring";

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

type CategorySuggestion = {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
};

type SubcategoryMap = Record<string, string[]>;

const EXPENSE_CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  { label: "Auto & Transport", icon: "truck", color: "#4C6EF5" },
  { label: "Housing", icon: "home", color: "#1971C2" },
  { label: "Bills & Utilities", icon: "zap", color: "#15AABF" },
  { label: "Food & Dining", icon: "coffee", color: "#F08C00" },
  { label: "Groceries", icon: "shopping-cart", color: "#2F9E44" },
  { label: "Shopping", icon: "shopping-bag", color: "#E8590C" },
  { label: "Health & Fitness", icon: "activity", color: "#E03131" },
  { label: "Entertainment", icon: "film", color: "#845EF7" },
  { label: "Travel", icon: "map-pin", color: "#F06595" },
  { label: "Gifts & Donations", icon: "gift", color: "#BE4BDB" },
];

const INCOME_CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  { label: "Salary", icon: "briefcase", color: "#2F9E44" },
  { label: "Business Income", icon: "dollar-sign", color: "#12B886" },
  { label: "Freelance", icon: "pen-tool", color: "#15AABF" },
  { label: "Investments", icon: "trending-up", color: "#1C7ED6" },
  { label: "Interest", icon: "percent", color: "#5C7CFA" },
  { label: "Gifts", icon: "gift", color: "#F06595" },
  { label: "Rental Income", icon: "home", color: "#1971C2" },
  { label: "Refunds", icon: "refresh-cw", color: "#ADB5BD" },
  { label: "Bonuses", icon: "award", color: "#F59F00" },
  { label: "Other Income", icon: "layers", color: "#845EF7" },
];

const ALL_CATEGORY_SUGGESTIONS = [
  ...EXPENSE_CATEGORY_SUGGESTIONS,
  ...INCOME_CATEGORY_SUGGESTIONS,
].filter(
  (item, index, arr) =>
    arr.findIndex(
      (entry) => entry.label.toLowerCase() === item.label.toLowerCase(),
    ) === index,
);
const ICON_GROUPS: { title: string; icons: CategorySuggestion[] }[] = [
  {
    title: "Essentials",
    icons: [
      { label: "Groceries", icon: "shopping-cart", color: "#000000" },
      { label: "Dining", icon: "coffee", color: "#000000" },
      { label: "Shopping", icon: "shopping-bag", color: "#000000" },
      { label: "Bills", icon: "file-text", color: "#000000" },
    ],
  },
  {
    title: "Home",
    icons: [
      { label: "Home", icon: "home", color: "#000000" },
      { label: "Utilities", icon: "zap", color: "#000000" },
      { label: "Water", icon: "droplet", color: "#000000" },
      { label: "Internet", icon: "wifi", color: "#000000" },
    ],
  },
  {
    title: "Lifestyle",
    icons: [
      { label: "Health", icon: "activity", color: "#000000" },
      { label: "Fitness", icon: "heart", color: "#000000" },
      { label: "Leisure", icon: "sun", color: "#000000" },
      { label: "Entertainment", icon: "film", color: "#000000" },
    ],
  },
  {
    title: "Travel",
    icons: [
      { label: "Transport", icon: "truck", color: "#000000" },
      { label: "Travel", icon: "map-pin", color: "#000000" },
      { label: "Navigation", icon: "navigation", color: "#000000" },
      { label: "Compass", icon: "compass", color: "#000000" },
    ],
  },
  {
    title: "Work & Learn",
    icons: [
      { label: "Work", icon: "briefcase", color: "#000000" },
      { label: "Education", icon: "book", color: "#000000" },
      { label: "Tech", icon: "cpu", color: "#000000" },
      { label: "Awards", icon: "award", color: "#000000" },
    ],
  },
  {
    title: "Social",
    icons: [
      { label: "Gifts", icon: "gift", color: "#000000" },
      { label: "People", icon: "users", color: "#000000" },
      { label: "Memories", icon: "camera", color: "#000000" },
      { label: "Smile", icon: "smile", color: "#000000" },
    ],
  },
  {
    title: "Personal",
    icons: [
      { label: "Beauty", icon: "scissors", color: "#000000" },
      { label: "Music", icon: "music", color: "#000000" },
      { label: "Phone", icon: "phone", color: "#000000" },
      { label: "Bookmarks", icon: "bookmark", color: "#000000" },
    ],
  },
];

const ICON_CHOICES = ICON_GROUPS.flatMap((group) => group.icons);
const COLOR_CHOICES = [
  "#2F9E44",
  "#12B886",
  "#15AABF",
  "#1C7ED6",
  "#5C7CFA",
  "#845EF7",
  "#BE4BDB",
  "#F06595",
  "#E03131",
  "#F76707",
  "#F59F00",
  "#ADB5BD",
];

const EXPENSE_SUBCATEGORIES: SubcategoryMap = {
  "Auto & Transport": [
    "Auto Payment",
    "Public Transit",
    "Gas",
    "Auto Maintenance",
    "Parking & Tolls",
    "Taxi & Ride Shares",
  ],
  Housing: ["Mortgage", "Rent", "Home Improvement", "HOA Fees", "Property Tax"],
  "Bills & Utilities": [
    "Electricity",
    "Water",
    "Internet",
    "Phone",
    "Gas",
    "Garbage",
  ],
  "Food & Dining": ["Restaurants", "Cafe", "Takeout", "Delivery"],
  Groceries: ["Supermarket", "Farmers Market", "Snacks", "Household"],
  Shopping: ["Clothing", "Electronics", "Home Goods", "Personal Care"],
  "Health & Fitness": ["Pharmacy", "Doctor", "Dental", "Gym"],
  Entertainment: ["Movies", "Games", "Streaming", "Events"],
  Travel: ["Flights", "Hotels", "Transit", "Car Rental"],
  "Gifts & Donations": ["Charity", "Gifts"],
  Other: ["Misc", "One-time", "Recurring"],
};

const INCOME_SUBCATEGORIES: SubcategoryMap = {
  Salary: ["Paychecks", "Bonuses", "Commission"],
  "Business Income": ["Sales", "Services", "Other"],
  Freelance: ["Projects", "Consulting", "Contract"],
  Investments: ["Dividends", "Capital Gains", "Interest"],
  Interest: ["Bank Interest", "Cashback", "Savings Interest"],
  Gifts: ["Gifts", "Donations", "Support"],
  "Rental Income": ["Rent", "Lease", "Airbnb"],
  Refunds: ["Returns", "Reimbursements", "Tax Refund"],
  Bonuses: ["Annual Bonus", "Performance Bonus", "Referral Bonus"],
  "Other Income": ["Other", "Misc", "One-time"],
  Other: ["Other", "Misc", "One-time"],
};

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
                    <View key={item.key} style={styles.categoryGridItem}>
                      <Pressable
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
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={[
                            styles.quickPickText,
                            { color: isSelected ? (ui.accent ?? ui.text) : ui.text },
                          ]}
                        >
                          {item.label}
                        </ThemedText>
                      </Pressable>
                    </View>
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
  iconGroups: { title: string; icons: CategorySuggestion[] }[];
  newCategoryIcon: CategorySuggestion;
  onSelectNewCategoryIcon: (icon: CategorySuggestion) => void;
  colorChoices: string[];
  newCategoryColor: string;
  onSelectNewCategoryColor: (color: string) => void;
  newCategoryName: string;
  onChangeNewCategoryName: (value: string) => void;
  onCreateCategory: () => void;
};

function CreateCategoryModal({
  visible,
  onClose,
  ui,
  iconGroups,
  newCategoryIcon,
  onSelectNewCategoryIcon,
  colorChoices,
  newCategoryColor,
  onSelectNewCategoryColor,
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
            <View style={[styles.iconPickerWrap, styles.iconPickerWrapCompact]}>
              {iconGroups.map((group) => (
                <View key={group.title} style={[styles.iconGroup, styles.iconGroupCompact]}>
                  <ThemedText style={[styles.iconGroupTitle, { color: ui.mutedText }]}>
                    {group.title}
                  </ThemedText>
                  <View style={[styles.categoryGrid, styles.categoryGridCompact]}>
                    {group.icons.map((icon) => {
                      const isActive = icon.icon === newCategoryIcon.icon;
                      return (
                        <View
                          key={`${group.title}:${icon.label}`}
                          style={[styles.categoryGridItem, styles.categoryGridItemCompact]}
                        >
                          <Pressable
                            onPress={() => onSelectNewCategoryIcon(icon)}
                            style={({ pressed }) => [
                              styles.quickPickItem,
                              {
                                opacity: pressed ? 0.7 : 1,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.quickPickIcon,
                                {
                                  backgroundColor: ui.surface2,
                                  borderColor: isActive ? (ui.accent ?? ui.text) : "transparent",
                                  borderWidth: isActive ? 2 : 0,
                                },
                              ]}
                            >
                              <Feather name={icon.icon} size={22} color={ui.text} />
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={[styles.colorPickerDivider, { backgroundColor: ui.border }]} />
              <View style={[styles.colorPickerRow, styles.colorPickerRowCompact]}>
                {colorChoices.map((color) => {
                  const isActive = color === newCategoryColor;
                  return (
                    <View key={color} style={styles.colorSwatchWrap}>
                      <Pressable
                        onPress={() => onSelectNewCategoryColor(color)}
                        style={({ pressed }) => [
                          styles.colorSwatch,
                          {
                            backgroundColor: color,
                            borderColor: isActive ? (ui.accent ?? ui.text) : "transparent",
                            borderWidth: isActive ? 2 : 0,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      />
                    </View>
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

type SubcategoryPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  ui: any;
  subcategories: SubcategoryRow[];
  suggestedSubcategories: string[];
  selectedSubcategoryId: number | null;
  onSelectSubcategory: (subcategory: SubcategoryRow) => void;
  onPickSuggested: (label: string) => void;
  onDeleteSubcategory: (subcategoryId: number) => void;
  onOpenCreate: () => void;
};

function SubcategoryPickerModal({
  visible,
  onClose,
  ui,
  subcategories,
  suggestedSubcategories,
  selectedSubcategoryId,
  onSelectSubcategory,
  onPickSuggested,
  onDeleteSubcategory,
  onOpenCreate,
}: SubcategoryPickerModalProps) {
  const combinedOptions = [
    ...suggestedSubcategories.map((label) => ({
      type: "suggested" as const,
      key: `suggested:${label}`,
      label,
    })),
    ...subcategories.map((sub) => ({
      type: "existing" as const,
      key: `existing:${sub.id}`,
      id: sub.id,
      label: sub.category_name ?? "Unnamed",
    })),
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
        <View style={[styles.popupCard, { backgroundColor: ui.surface, borderColor: ui.border }]}>
          <View style={styles.popupHeader}>
            <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
              Select Subcategory
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
                No subcategories yet.
              </ThemedText>
            ) : (
              <View style={styles.subcategoryChips}>
                {combinedOptions.map((item) => {
                  const isSelected =
                    item.type === "existing" && selectedSubcategoryId === item.id;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        if (item.type === "suggested") {
                          onPickSuggested(item.label);
                          return;
                        }
                        const match = subcategories.find((sub) => sub.id === item.id);
                        if (match) onSelectSubcategory(match);
                      }}
                      onLongPress={() => {
                        if (item.type === "existing") onDeleteSubcategory(item.id);
                      }}
                      style={({ pressed }) => [
                        styles.subcategoryChip,
                        {
                          borderColor: isSelected ? (ui.accent ?? ui.text) : ui.border,
                          backgroundColor: isSelected ? ui.accentSoft : ui.surface,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color: isSelected ? (ui.accent ?? ui.text) : ui.text,
                          fontWeight: "500",
                        }}
                      >
                        {item.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
          <Pressable
            onPress={onOpenCreate}
            style={({ pressed }) => [
              styles.fabButton,
              { backgroundColor: ui.text, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type CreateSubcategoryModalProps = {
  visible: boolean;
  onClose: () => void;
  ui: any;
  newSubcategoryName: string;
  onChangeNewSubcategoryName: (value: string) => void;
  onCreateSubcategory: () => void;
};

function CreateSubcategoryModal({
  visible,
  onClose,
  ui,
  newSubcategoryName,
  onChangeNewSubcategoryName,
  onCreateSubcategory,
}: CreateSubcategoryModalProps) {
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
        <View style={[styles.popupCard, { backgroundColor: ui.surface, borderColor: ui.border }]}>
          <View style={styles.popupHeader}>
            <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
              New Subcategory
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.popupClose, { backgroundColor: ui.surface2 }]}
            >
              <Feather name="x" size={16} color={ui.text} />
            </Pressable>
          </View>

          <View style={[styles.popupFooter, { borderTopColor: ui.border }]}>
            <View style={styles.footerRow}>
              <TextInput
                value={newSubcategoryName}
                onChangeText={onChangeNewSubcategoryName}
                placeholder="New subcategory name"
                placeholderTextColor={ui.mutedText}
                style={[
                  styles.footerInput,
                  { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text },
                ]}
              />
              <Pressable
                onPress={onCreateSubcategory}
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
  mode?: "add" | "view" | "edit";
  initialTransaction?: ExpenseRow | null;
  recurringRules?: any[];
  onEditRequest?: () => void;
  onDeleteRequest?: () => void;
}

const EMPTY_RECURRING_RULES: any[] = [];

export function AddTransactionModal({
  visible,
  onClose,
  accounts,
  categories,
  onRefresh,
  ui,
  isDark,
  userId,
  mode = "add",
  initialTransaction = null,
  recurringRules = EMPTY_RECURRING_RULES,
  onEditRequest,
  onDeleteRequest,
}: AddTransactionModalProps) {
  const insets = useSafeAreaInsets();
  const amountInputRef = React.useRef<TextInput>(null);
  const togglePadding = 2;
  const keyboardShift = React.useRef(new Animated.Value(0)).current;
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

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
  const [selectedSubcategory, setSelectedSubcategory] = useState<SubcategoryRow | null>(
    null,
  );
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("Monthly");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [addRuleEndsOn, setAddRuleEndsOn] = useState("");
  const [addRuleNextRunDate, setAddRuleNextRunDate] = useState("");
  const [recurrenceTouched, setRecurrenceTouched] = useState(false);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [createSubcategoryModalOpen, setCreateSubcategoryModalOpen] = useState(false);
  const [addFrequencyModalOpen, setAddFrequencyModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<CategorySuggestion>(
    ICON_CHOICES[0],
  );
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_CHOICES[0]);
  const [categoryIconOverrides, setCategoryIconOverrides] = useState<
    Record<number, CategorySuggestion>
  >({});
  // TODO(backend): Persist notes/labels once supported.
  const [notes, setNotes] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [toggleWidth, setToggleWidth] = useState(0);
  const toggleTranslate = React.useRef(new Animated.Value(0)).current;
  const toggleOptions = ["income", "expense", "transfer"] as const;

  const categorySuggestions = useMemo(
    () =>
      transactionType === "income"
        ? INCOME_CATEGORY_SUGGESTIONS
        : EXPENSE_CATEGORY_SUGGESTIONS,
    [transactionType],
  );

  const suggestedCategories = useMemo(() => {
    const existing = new Set(
      categories
        .map((cat) => (cat.category_name ?? "").trim().toLowerCase())
        .filter(Boolean),
    );
    return categorySuggestions.filter(
      (item) => !existing.has(item.label.toLowerCase()),
    );
  }, [categories, categorySuggestions]);

  const subcategoryOptions = useMemo(() => {
    const name = (selectedCategory?.category_name ?? "").trim();
    if (!name) return [];
    const source = transactionType === "income"
      ? INCOME_SUBCATEGORIES
      : EXPENSE_SUBCATEGORIES;
    const exact = Object.keys(source).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    );
    if (exact) return source[exact];
    const partial = Object.keys(source).find((key) =>
      name.toLowerCase().includes(key.toLowerCase()),
    );
    if (partial) return source[partial];
    return source.Other ?? [];
  }, [selectedCategory?.category_name, transactionType]);

  const resolveCategoryIcon = useCallback(
    (category: CategoryRow) => {
      const override = categoryIconOverrides[category.id];
      if (override) return override;
      const match = ALL_CATEGORY_SUGGESTIONS.find(
        (item) =>
          item.label.toLowerCase() ===
          (category.category_name ?? "").trim().toLowerCase(),
      );
      return match ?? null;
    },
    [categoryIconOverrides],
  );

  const quickPickOptions = useMemo(() => {
    const selectedName = (selectedCategory?.category_name ?? "").trim();
    const selectedLower = selectedName.toLowerCase();
    const picks: CategorySuggestion[] = [];

    if (selectedName) {
      const resolved =
        (selectedCategory && resolveCategoryIcon(selectedCategory)) ?? null;
      const fallbackIcon = "tag" as React.ComponentProps<typeof Feather>["name"];
      picks.push({
        label: selectedName,
        icon: resolved?.icon ?? fallbackIcon,
        color: resolved?.color ?? (ui.accent ?? "#4C6EF5"),
      });
    }

    for (const item of categorySuggestions) {
      if (picks.length >= 3) break;
      if (item.label.toLowerCase() === selectedLower) continue;
      picks.push(item);
    }

    return picks;
  }, [categorySuggestions, resolveCategoryIcon, selectedCategory, ui.accent]);

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
        const match = categorySuggestions.find(
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
    [categories, onRefresh, userId, setCategoryIconOverrides, categorySuggestions],
  );

  // Reset state when modal opens
  useEffect(() => {
    if (!visible) return;

    if ((isViewMode || isEditMode) && initialTransaction) {
      const signedAmount = initialTransaction.amount ?? 0;
      const derivedType = signedAmount < 0 ? "income" : "expense";
      const formattedAmount =
        initialTransaction.amount != null
          ? Math.abs(initialTransaction.amount).toFixed(2)
          : "";
      const accountMatch = accounts.find(
        (account) => account.id === initialTransaction.account_id,
      );
      const categoryMatch = categories.find(
        (category) => category.id === initialTransaction.expense_categoryid,
      );
      const ruleMatch = initialTransaction.recurring_rule_id
        ? recurringRules.find(
            (rule) => rule.id === initialTransaction.recurring_rule_id,
          )
        : null;

      setAmount(formattedAmount);
      setDescription(initialTransaction.description ?? "");
      setNotes("");
      setNotesModalOpen(false);
      setTransactionDate(
        initialTransaction.transaction_date || toLocalISOString(new Date()),
      );
      setTransactionType(derivedType);
      setSelectedAccount(accountMatch ?? null);
      setSelectedCategory(categoryMatch ?? null);
      setSelectedSubcategory(null);
      setSubcategories([]);
      setIsRecurring(!!ruleMatch);
      setRecurringFrequency(ruleMatch?.frequency ?? "Monthly");
      setHasEndDate(!!ruleMatch?.end_date);
      setAddRuleEndsOn(ruleMatch?.end_date ?? "");
      setAddRuleNextRunDate(ruleMatch?.next_run_date ?? "");
      setRecurrenceTouched(false);
      setNewCategoryIcon(ICON_CHOICES[0]);
      setNewCategoryColor(COLOR_CHOICES[0]);
      setNewSubcategoryName("");
      setCreateCategoryModalOpen(false);
      setSubcategoryModalOpen(false);
      setCreateSubcategoryModalOpen(false);
      return;
    }

    setAmount("");
    setDescription("");
    setNotes("");
    setNotesModalOpen(false);
    setTransactionDate(toLocalISOString(new Date()));
    setTransactionType("expense");
    setSelectedAccount(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    setIsRecurring(false);
    setRecurringFrequency("Monthly");
    setHasEndDate(false);
    setAddRuleEndsOn("");
    setAddRuleNextRunDate("");
    setRecurrenceTouched(false);
    setNewCategoryIcon(ICON_CHOICES[0]);
    setNewCategoryColor(COLOR_CHOICES[0]);
    setNewSubcategoryName("");
    setCreateCategoryModalOpen(false);
    setSubcategoryModalOpen(false);
    setCreateSubcategoryModalOpen(false);
  }, [
    visible,
    isViewMode,
    isEditMode,
    initialTransaction,
    accounts,
    categories,
    recurringRules,
  ]);

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

  useEffect(() => {
    setSelectedSubcategory(null);
  }, [selectedCategory?.id, transactionType]);

  useEffect(() => {
    const loadSubcategories = async () => {
      if (!userId || !selectedCategory) {
        setSubcategories([]);
        return;
      }
      try {
        const data = await listSubcategories({
          profile_id: userId,
          category_id: selectedCategory.id,
        });
        setSubcategories((data as SubcategoryRow[]) ?? []);
      } catch (error) {
        console.error("Error loading subcategories:", error);
      }
    };
    loadSubcategories();
  }, [userId, selectedCategory?.id]);

  useEffect(() => {
    if (
      !visible ||
      !isViewMode ||
      !initialTransaction?.subcategory_id ||
      subcategories.length === 0
    ) {
      return;
    }
    const match = subcategories.find(
      (sub) => sub.id === initialTransaction.subcategory_id,
    );
    if (match) {
      setSelectedSubcategory(match);
    }
  }, [
    subcategories,
    initialTransaction?.subcategory_id,
    visible,
    isViewMode,
  ]);

  // Recalculate default Next Run Date when Frequency or IsRecurring changes
  useEffect(() => {
    if (isViewMode) return;
    if (isEditMode && !recurrenceTouched) return;
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
  }, [isRecurring, recurringFrequency, isViewMode, isEditMode, recurrenceTouched]);

  // TODO(backend): Allow transfer flow once accounts-to-accounts transfers are supported.
  const canCreate = useMemo(() => {
    if (isViewMode) return false;
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
    isViewMode,
  ]);

  const handleSubmit = async () => {
    if (isEditMode) {
      await updateTransaction();
      return;
    }
    await createTransaction();
  };

  const createTransaction = async () => {
    if (isViewMode || isEditMode) return;
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
          subcategory_id: selectedSubcategory ? selectedSubcategory.id : null,
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
        subcategory_id: selectedSubcategory ? selectedSubcategory.id : null,
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
          [data.id]: {
            label: newCategoryIcon.label,
            icon: newCategoryIcon.icon,
            color: newCategoryColor,
          },
        }));
        setNewCategoryIcon(ICON_CHOICES[0]);
        setNewCategoryColor(COLOR_CHOICES[0]);
        setSelectedCategory(data as CategoryRow);
        setCreateCategoryModalOpen(false);
        await onRefresh();
        // Keep modal open so user can see it's selected
      } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("Could not create category", "Please try again.");
    }
  };

  const updateTransaction = async () => {
    if (!userId || !initialTransaction) return;
    if (!selectedAccount || !selectedCategory) return;

    const parsed = parseFloat(amount.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than 0.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing description", "Enter a description.");
      return;
    }

    setIsLoading(true);

    try {
      let finalRecurringRuleId = initialTransaction.recurring_rule_id ?? null;

      if (initialTransaction.recurring_rule_id && !isRecurring) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Remove recurrence?",
            "This will stop this transaction from recurring.",
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
          id: initialTransaction.recurring_rule_id,
          profile_id: userId,
        });
        finalRecurringRuleId = null;
      } else if (isRecurring && initialTransaction.recurring_rule_id) {
        await updateRecurringRule({
          id: initialTransaction.recurring_rule_id,
          profile_id: userId,
          update: {
            frequency: recurringFrequency as any,
            next_run_date: addRuleNextRunDate.trim() || undefined,
            end_date:
              isRecurring && hasEndDate && addRuleEndsOn.trim()
                ? addRuleEndsOn.trim()
                : null,
          },
        });
      } else if (isRecurring && !initialTransaction.recurring_rule_id) {
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
          subcategory_id: selectedSubcategory ? selectedSubcategory.id : null,
        });
        finalRecurringRuleId = rule.id;
      }

      const signedAmount = parsed * (transactionType === "income" ? -1 : 1);

      await updateExpense({
        id: initialTransaction.id,
        profile_id: userId,
        update: {
          account_id: selectedAccount.id,
          expense_categoryid: selectedCategory.id,
          subcategory_id: selectedSubcategory ? selectedSubcategory.id : null,
          amount: signedAmount,
          recurring_rule_id: finalRecurringRuleId,
          description: description.trim().length ? description.trim() : null,
          transaction_date: transactionDate || undefined,
        },
      });

      const originalAmount = initialTransaction.amount ?? 0;
      const originalAccountId = initialTransaction.account_id;
      const updatedAccountId = selectedAccount.id;

      if (originalAccountId != null && originalAccountId === updatedAccountId) {
        const originalAccount = await getAccountById({
          id: originalAccountId,
          profile_id: userId,
        });
        if (originalAccount) {
          const netAmount = signedAmount - originalAmount;
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
          const updatedBalance = applyTransactionToBalance(updatedAccount, signedAmount);
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

  const createSubcategory = async () => {
    if (!userId || !selectedCategory) return;
    const trimmed = newSubcategoryName.trim();
    if (!trimmed) {
      Alert.alert("Subcategory name required", "Enter a subcategory name.");
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
      setCreateSubcategoryModalOpen(false);
      const subs = await listSubcategories({
        profile_id: userId,
        category_id: selectedCategory.id,
      });
      setSubcategories((subs as SubcategoryRow[]) ?? []);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      Alert.alert("Could not create subcategory", "Please try again.");
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
                setSubcategories((subs as SubcategoryRow[]) ?? []);
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

  const handleSuggestedSubcategory = async (label: string) => {
    if (!userId || !selectedCategory) return;
    const existing = subcategories.find(
      (sub) => (sub.category_name ?? "").trim().toLowerCase() === label.toLowerCase(),
    );
    if (existing) {
      setSelectedSubcategory(existing);
      setSubcategoryModalOpen(false);
      return;
    }
    try {
      const data = await addSubcategory({
        profile_id: userId,
        category_id: selectedCategory.id,
        category_name: label,
      });
      setSelectedSubcategory(data as SubcategoryRow);
      setSubcategoryModalOpen(false);
      const subs = await listSubcategories({
        profile_id: userId,
        category_id: selectedCategory.id,
      });
      setSubcategories((subs as SubcategoryRow[]) ?? []);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      Alert.alert("Could not create subcategory", "Please try again.");
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
                setSelectedSubcategory(null);
                setSubcategories([]);
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
              {isViewMode ? "Transaction Details" : isEditMode ? "Edit Transaction" : "Add Transaction"}
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
                    onPress={() => {
                      if (!isViewMode) amountInputRef.current?.focus();
                    }}
                    disabled={isViewMode}
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
                      editable={!isViewMode}
                      onBlur={() => {
                        if (amount) {
                          const parsed = parseFloat(amount);
                          if (!Number.isNaN(parsed)) {
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
                          onPress={() => {
                            if (!isViewMode) handleTypeChange(type);
                          }}
                          disabled={isViewMode}
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
                      editable={!isViewMode}
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
                    onPress={() => {
                      if (!isViewMode) setAccountModalOpen(true);
                    }}
                    disabled={isViewMode}
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
                          selectedAccount && {
                            color: ui.accent ?? ui.text,
                            fontWeight: "600",
                          },
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
                    disabled={isViewMode}
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
                    onPress={() => {
                      if (!isViewMode) setCategoryModalOpen(true);
                    }}
                    disabled={isViewMode}
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
                          selectedCategory && {
                            color: ui.accent ?? ui.text,
                            fontWeight: "600",
                          },
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

                  {!isViewMode && (
                    <View style={styles.quickPickWrap}>
                      <ThemedText
                        style={[styles.quickPickLabel, { color: ui.mutedText }]}
                      >
                        Quick picks
                      </ThemedText>
                      <View style={styles.quickPickRow}>
                        {quickPickOptions.map((item) => {
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
                                numberOfLines={2}
                                ellipsizeMode="tail"
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
                            numberOfLines={2}
                            ellipsizeMode="tail"
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
                  )}
                  <View
                    style={[
                      styles.rowSeparator,
                      { backgroundColor: ui.border },
                    ]}
                  />

                  <Pressable
                    onPress={() => {
                      if (isViewMode) return;
                      if (!selectedCategory) {
                        Alert.alert("Category required", "Please select a category first.");
                        return;
                      }
                      setSubcategoryModalOpen(true);
                    }}
                    disabled={isViewMode}
                    style={[
                      styles.inputRow,
                      !selectedCategory && { opacity: 0.55 },
                      isViewMode && { opacity: 0.75 },
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <Feather name="layers" size={18} color={ui.mutedText} />
                      <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                        Subcategory
                      </ThemedText>
                    </View>
                    <View style={styles.rowRight}>
                      <ThemedText
                        style={[
                          styles.rowValueRight,
                          !selectedSubcategory && { color: ui.mutedText },
                          selectedSubcategory && {
                            color: ui.accent ?? ui.text,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {selectedSubcategory?.category_name ?? "Select"}
                      </ThemedText>
                      <Feather name="chevron-right" size={16} color={ui.mutedText} />
                    </View>
                  </Pressable>

                  <View
                    style={[
                      styles.rowSeparator,
                      { backgroundColor: ui.border },
                    ]}
                  />

                  <Pressable
                    onPress={() => {
                      if (!isViewMode) setAddFrequencyModalOpen(true);
                    }}
                    disabled={isViewMode}
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
                        style={[
                          styles.rowValueRight,
                          !isRecurring && { color: ui.text },
                          isRecurring && {
                            color: ui.accent ?? ui.text,
                            fontWeight: "600",
                          },
                        ]}
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
                        editable={!isViewMode}
                        style={[styles.notesInput, { color: ui.text }]}
                      />
                      <Pressable
                        style={styles.notesExpand}
                        hitSlop={8}
                        onPress={() => {
                          if (!isViewMode) setNotesModalOpen(true);
                        }}
                        disabled={isViewMode}
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
                        disabled={isViewMode}
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
                          disabled={isViewMode}
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
                            disabled={isViewMode}
                          />
                        </>
                      )}
                    </>
                  )}
                </View>
                <View style={styles.footerStack}>
                  {isViewMode ? (
                    <View style={styles.viewActionRow}>
                      <Pressable
                        onPress={onEditRequest}
                        disabled={!onEditRequest}
                        style={({ pressed }) => [
                          styles.viewActionButton,
                          {
                            backgroundColor: isDark ? "#FFFFFF" : "#000000",
                            borderColor: ui.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                          !onEditRequest && styles.buttonDisabled,
                        ]}
                      >
                        <ThemedText
                          type="defaultSemiBold"
                          style={{ color: isDark ? "#1C1C1E" : "#FFFFFF" }}
                        >
                          Edit
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={onDeleteRequest}
                        disabled={!onDeleteRequest}
                        style={({ pressed }) => [
                          styles.viewActionButton,
                          styles.viewActionDanger,
                          {
                            borderColor: ui.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                          !onDeleteRequest && styles.buttonDisabled,
                        ]}
                      >
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.viewActionDangerText}
                        >
                          Delete
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleSubmit}
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
                          {isEditMode ? "Save Changes" : "Submit"}
                        </ThemedText>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>

        {/* Frequency Picker */}
        <Modal
          visible={addFrequencyModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAddFrequencyModalOpen(false)}
        >
          <View style={styles.popupOverlay}>
            <Pressable
              style={[
                styles.popupBackdrop,
                { backgroundColor: ui.backdrop ?? "rgba(0,0,0,0.35)" },
              ]}
              onPress={() => setAddFrequencyModalOpen(false)}
            />
            <View
              style={[
                styles.popupCard,
                { backgroundColor: ui.surface, borderColor: ui.border },
              ]}
            >
              <View style={styles.popupHeader}>
                <ThemedText type="defaultSemiBold" style={{ color: ui.text }}>
                  Select Recurrence
                </ThemedText>
                <Pressable
                  onPress={() => setAddFrequencyModalOpen(false)}
                  hitSlop={12}
                  style={[styles.popupClose, { backgroundColor: ui.surface2 }]}
                >
                  <Feather name="x" size={16} color={ui.text} />
                </Pressable>
              </View>

              <View style={styles.frequencyPillWrap}>
                {["Once", "Daily", "Weekly", "Monthly", "Yearly"].map((freq) => {
                  const isSelected =
                    freq === "Once"
                      ? !isRecurring
                      : isRecurring && recurringFrequency === freq;
                  return (
                    <Pressable
                      key={freq}
                      style={({ pressed }) => [
                        styles.frequencyPill,
                        {
                          borderColor: isSelected ? (ui.accent ?? ui.text) : ui.border,
                          backgroundColor: isSelected ? ui.accentSoft : ui.surface2,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      onPress={() => {
                        if (isEditMode) {
                          setRecurrenceTouched(true);
                        }
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
                        numberOfLines={1}
                        style={[
                          styles.frequencyPillText,
                          { color: isSelected ? (ui.accent ?? ui.text) : ui.text },
                        ]}
                      >
                        {freq}
                      </ThemedText>
                      {isSelected && (
                        <Feather name="check" size={14} color={ui.accent ?? ui.text} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

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
          iconGroups={ICON_GROUPS}
          newCategoryIcon={newCategoryIcon}
          onSelectNewCategoryIcon={setNewCategoryIcon}
          colorChoices={COLOR_CHOICES}
          newCategoryColor={newCategoryColor}
          onSelectNewCategoryColor={setNewCategoryColor}
          newCategoryName={newCategoryName}
          onChangeNewCategoryName={setNewCategoryName}
          onCreateCategory={createCategory}
        />
        <SubcategoryPickerModal
          visible={subcategoryModalOpen}
          onClose={() => setSubcategoryModalOpen(false)}
          ui={ui}
          subcategories={subcategories}
          suggestedSubcategories={subcategoryOptions}
          selectedSubcategoryId={selectedSubcategory?.id ?? null}
          onSelectSubcategory={(sub) => {
            setSelectedSubcategory(sub);
            setSubcategoryModalOpen(false);
          }}
          onPickSuggested={handleSuggestedSubcategory}
          onDeleteSubcategory={handleDeleteSubcategory}
          onOpenCreate={() => {
            setSubcategoryModalOpen(false);
            setCreateSubcategoryModalOpen(true);
          }}
        />
        <CreateSubcategoryModal
          visible={createSubcategoryModalOpen}
          onClose={() => setCreateSubcategoryModalOpen(false)}
          ui={ui}
          newSubcategoryName={newSubcategoryName}
          onChangeNewSubcategoryName={setNewSubcategoryName}
          onCreateSubcategory={createSubcategory}
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
                editable={!isViewMode}
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
  viewActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  viewActionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  viewActionDanger: {
    backgroundColor: "transparent",
  },
  viewActionDangerText: {
    color: "#D32F2F",
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
    maxHeight: "88%",
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
  popupClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  popupList: {
    flexShrink: 1,
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
  frequencyPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    alignContent: "flex-start",
    width: "100%",
    justifyContent: "space-between",
    rowGap: 10,
    columnGap: 10,
    paddingBottom: 6,
  },
  frequencyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    width: "48%",
    minHeight: 44,
  },
  frequencyPillText: {
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
    justifyContent: "flex-start",
  },
  categoryGridCompact: {
    marginBottom: 2,
  },
  categoryGridItem: {
    width: "25%",
    alignItems: "center",
    paddingBottom: 12,
  },
  categoryGridItemCompact: {
    paddingBottom: 8,
  },
  popupFooter: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconPickerWrap: {
    gap: 8,
    marginBottom: 10,
  },
  iconPickerWrapCompact: {
    gap: 6,
    marginBottom: 6,
  },
  iconGroup: {
    gap: 8,
  },
  iconGroupCompact: {
    gap: 6,
  },
  iconGroupTitle: {
    fontSize: 13,
    letterSpacing: 0.4,
    fontFamily: Tokens.font.semiFamily ? Tokens.font.family : Tokens.font.family,
  },
  colorPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    rowGap: 12,
    columnGap: 0,
  },
  colorPickerRowCompact: {
    rowGap: 8,
  },
  colorPickerDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginTop: 2,
    marginBottom: 8,
  },
  colorSwatchWrap: {
    width: "16.666%",
    alignItems: "center",
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    lineHeight: 14,
    fontFamily: Tokens.font.family,
  },
  subcategoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 4,
  },
  subcategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fabButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

