import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  consumePendingRecurrenceFrequencySelection,
  setPendingRecurrenceFrequencySelection,
} from "@/components/transactions/pending-recurrence-frequency-selection";
import { consumePendingTransactionCategorySelection } from "@/components/transactions/pending-transaction-category-selection";
import { consumePendingTransactionSubcategorySelection } from "@/components/transactions/pending-transaction-subcategory-selection";
import type {
  CategoryRow,
  RecurringRule,
  SubcategoryRow,
} from "@/components/transactions/tab/types";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  getCategorySuggestions,
  getSuggestedSubcategories,
  resolveCategorySuggestion,
  type CategorySuggestion,
} from "@/components/transactions/transaction-classification-options";
import { Tokens } from "@/constants/authTokens";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useThemeUI } from "@/hooks/use-theme-ui";
import {
  addCategory,
  addSubcategory,
  listCategories,
  listSubcategories,
} from "@/utils/categories";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import {
  deleteRecurringRule,
  getRecurringRules,
  updateRecurringRule,
} from "@/utils/recurring";

const RECURRENCE_FREQUENCIES = ["Daily", "Weekly", "Monthly", "Yearly"];

export default function RecurrenceEditScreen() {
  const { session } = useAuthContext();
  const userId = session?.user.id;
  const ui = useThemeUI();
  const router = useRouter();
  const navigation = useNavigation();
  const { id, initialData } = useLocalSearchParams<{
    id: string;
    initialData?: string;
  }>();

  const initialRule = useMemo<RecurringRule | null>(() => {
    if (!initialData) return null;
    try {
      return JSON.parse(decodeURIComponent(initialData));
    } catch {
      return null;
    }
  }, [initialData]);

  const [rule, setRule] = useState<RecurringRule | null>(initialRule);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [allowRemoval, setAllowRemoval] = useState(false);

  const [name, setName] = useState(initialRule?.name ?? "");
  const [amount, setAmount] = useState(
    initialRule?.amount != null ? String(initialRule.amount) : "",
  );
  const [frequency, setFrequency] = useState(initialRule?.frequency ?? "Monthly");
  const [nextRunDate, setNextRunDate] = useState(initialRule?.next_run_date ?? "");
  const [endDate, setEndDate] = useState(initialRule?.end_date ?? "");
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<SubcategoryRow | null>(null);

  const loadData = useCallback(async () => {
    if (!userId || !id) return;

    setIsLoading(true);
    try {
      const [categoryData, rules] = await Promise.all([
        listCategories({ profile_id: userId }),
        getRecurringRules({ profile_id: userId }),
      ]);
      const nextCategories = (categoryData as CategoryRow[]) ?? [];
      const nextRule =
        (rules as RecurringRule[]).find((item) => String(item.id) === id) ?? null;

      if (!nextRule) {
        Alert.alert("Error", "Recurrence not found.");
        router.back();
        return;
      }

      setCategories(nextCategories);
      setRule(nextRule);
      setName(nextRule.name ?? "");
      setAmount(nextRule.amount != null ? String(nextRule.amount) : "");
      setFrequency(nextRule.frequency ?? "Monthly");
      setNextRunDate(nextRule.next_run_date ?? "");
      setEndDate(nextRule.end_date ?? "");

      const categoryMatch =
        nextCategories.find((category) => category.id === nextRule.expense_categoryid) ??
        null;
      setSelectedCategory(categoryMatch);

      if (categoryMatch) {
        const subcategoryData = await listSubcategories({
          profile_id: userId,
          category_id: categoryMatch.id,
        });
        const nextSubcategories = (subcategoryData as SubcategoryRow[]) ?? [];
        setSubcategories(nextSubcategories);
        setSelectedSubcategory(
          nextSubcategories.find((sub) => sub.id === nextRule.subcategory_id) ??
            null,
        );
      } else {
        setSubcategories([]);
        setSelectedSubcategory(null);
      }
    } catch (error) {
      console.error("Error loading recurrence:", error);
      Alert.alert("Error", "Could not load this recurrence.");
    } finally {
      setIsLoading(false);
    }
  }, [id, router, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      const nextFrequency = consumePendingRecurrenceFrequencySelection();
      if (nextFrequency) {
        setFrequency(nextFrequency);
      }

      const nextCategory = consumePendingTransactionCategorySelection();
      if (nextCategory !== undefined) {
        setSelectedCategory(nextCategory);
        setSelectedSubcategory(null);
      }

      const nextSubcategory = consumePendingTransactionSubcategorySelection();
      if (nextSubcategory !== undefined) {
        setSelectedSubcategory(nextSubcategory);
      }
    }, []),
  );

  useEffect(() => {
    if (!userId || !selectedCategory) {
      setSubcategories([]);
      setSelectedSubcategory(null);
      return;
    }

    let isMounted = true;
    listSubcategories({
      profile_id: userId,
      category_id: selectedCategory.id,
    })
      .then((data) => {
        if (!isMounted) return;
        const nextSubcategories = (data as SubcategoryRow[]) ?? [];
        setSubcategories(nextSubcategories);
        setSelectedSubcategory((current) =>
          current && nextSubcategories.some((sub) => sub.id === current.id)
            ? current
            : null,
        );
      })
      .catch((error) => {
        console.error("Error loading subcategories:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, userId]);

  const categorySuggestions = useMemo(() => getCategorySuggestions("expense"), []);

  const quickPickOptions = useMemo(() => {
    const selectedName = (selectedCategory?.category_name ?? "").trim();
    const selectedLower = selectedName.toLowerCase();
    const picks: CategorySuggestion[] = [];

    if (selectedName) {
      const resolved = resolveCategorySuggestion(selectedName);
      picks.push({
        label: selectedName,
        icon: resolved?.icon ?? "tag",
        color: resolved?.color ?? (ui.accent ?? "#4C6EF5"),
      });
    }

    for (const item of categorySuggestions) {
      if (picks.length >= 3) break;
      if (item.label.toLowerCase() === selectedLower) continue;
      picks.push(item);
    }

    return picks;
  }, [categorySuggestions, selectedCategory?.category_name, ui.accent]);

  const quickPickSubcategoryOptions = useMemo(() => {
    if (!selectedCategory) return [];
    const selectedName = (selectedSubcategory?.category_name ?? "").trim();
    const selectedLower = selectedName.toLowerCase();
    const picks: string[] = [];
    const suggestions = getSuggestedSubcategories(
      selectedCategory.category_name,
      "expense",
    );

    if (selectedName) {
      picks.push(selectedName);
    }

    for (const label of suggestions) {
      if (picks.length >= 3) break;
      if (label.toLowerCase() === selectedLower) continue;
      picks.push(label);
    }

    return picks;
  }, [selectedCategory, selectedSubcategory?.category_name]);

  const handleSuggestedCategory = useCallback(
    async (label: string) => {
      if (!userId) return;
      const existing = categories.find(
        (category) =>
          (category.category_name ?? "").trim().toLowerCase() ===
          label.toLowerCase(),
      );
      if (existing) {
        setSelectedCategory(existing);
        setSelectedSubcategory(null);
        return;
      }

      try {
        const category = await addCategory({
          profile_id: userId,
          category_name: label,
        });
        setCategories((current) =>
          [...current, category as CategoryRow].sort((a, b) =>
            (a.category_name ?? "").localeCompare(b.category_name ?? ""),
          ),
        );
        setSelectedCategory(category as CategoryRow);
        setSelectedSubcategory(null);
      } catch (error) {
        console.error("Error creating category:", error);
        Alert.alert("Could not create category", "Please try again.");
      }
    },
    [categories, userId],
  );

  const handleSuggestedSubcategory = useCallback(
    async (label: string) => {
      if (!userId || !selectedCategory) return;
      const existing = subcategories.find(
        (subcategory) =>
          (subcategory.category_name ?? "").trim().toLowerCase() ===
          label.toLowerCase(),
      );
      if (existing) {
        setSelectedSubcategory(existing);
        return;
      }

      try {
        const subcategory = await addSubcategory({
          profile_id: userId,
          category_id: selectedCategory.id,
          category_name: label,
        });
        setSelectedSubcategory(subcategory as SubcategoryRow);
        const nextSubcategories = await listSubcategories({
          profile_id: userId,
          category_id: selectedCategory.id,
        });
        setSubcategories((nextSubcategories as SubcategoryRow[]) ?? []);
      } catch (error) {
        console.error("Error creating subcategory:", error);
        Alert.alert("Could not create subcategory", "Please try again.");
      }
    },
    [selectedCategory, subcategories, userId],
  );

  const isValid = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    return (
      Boolean(rule) &&
      name.trim().length > 0 &&
      Number.isFinite(parsedAmount) &&
      parsedAmount > 0 &&
      RECURRENCE_FREQUENCIES.includes(frequency) &&
      Boolean(nextRunDate) &&
      Boolean(selectedCategory)
    );
  }, [amount, frequency, name, nextRunDate, rule, selectedCategory]);

  const isDirty = useMemo(() => {
    if (!rule) return false;
    return (
      name.trim() !== (rule.name ?? "") ||
      (parseFloat(amount) || 0) !== (rule.amount ?? 0) ||
      frequency !== (rule.frequency ?? "Monthly") ||
      nextRunDate !== (rule.next_run_date ?? "") ||
      endDate !== (rule.end_date ?? "") ||
      selectedCategory?.id !== rule.expense_categoryid ||
      (selectedSubcategory?.id ?? null) !== (rule.subcategory_id ?? null)
    );
  }, [
    amount,
    endDate,
    frequency,
    name,
    nextRunDate,
    rule,
    selectedCategory,
    selectedSubcategory,
  ]);

  const handleSave = useCallback(async () => {
    if (!userId || !rule || !isValid) return;

    setIsSaving(true);
    try {
      await updateRecurringRule({
        id: rule.id,
        profile_id: userId,
        update: {
          name: name.trim(),
          amount: parseFloat(amount),
          frequency,
          next_run_date: nextRunDate,
          end_date: endDate.trim() ? endDate.trim() : null,
          expense_categoryid: selectedCategory?.id,
          subcategory_id: selectedSubcategory?.id ?? null,
          is_active: rule.is_active ?? true,
          account_id: rule.account_id ?? undefined,
        },
      });
      setAllowRemoval(true);
      router.back();
    } catch (error) {
      console.error("Error saving recurrence:", error);
      Alert.alert("Error", "Could not save this recurrence.");
    } finally {
      setIsSaving(false);
    }
  }, [
    amount,
    endDate,
    frequency,
    isValid,
    name,
    nextRunDate,
    router,
    rule,
    selectedCategory,
    selectedSubcategory,
    userId,
  ]);

  const handleToggleStatus = useCallback(() => {
    if (!userId || !rule) return;
    const nextStatus = !(rule.is_active ?? true);
    const title = nextStatus ? "Resume recurrence?" : "Pause recurrence?";
    const message = nextStatus
      ? "Future transactions will be created again."
      : "Future transactions will stop until you resume it.";

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: nextStatus ? "Resume" : "Pause",
        onPress: async () => {
          setIsSaving(true);
          try {
            await updateRecurringRule({
              id: rule.id,
              profile_id: userId,
              update: { is_active: nextStatus },
            });
            setRule((current) =>
              current ? { ...current, is_active: nextStatus } : current,
            );
          } catch (error) {
            console.error("Error updating recurrence status:", error);
            Alert.alert("Error", "Could not update this recurrence.");
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  }, [rule, userId]);

  const handleDelete = useCallback(() => {
    if (!userId || !rule) return;

    Alert.alert(
      "Delete recurrence?",
      "This action will permanently delete this recurring rule.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSaving(true);
            try {
              await deleteRecurringRule({ id: rule.id, profile_id: userId });
              setAllowRemoval(true);
              router.back();
            } catch (error) {
              console.error("Error deleting recurrence:", error);
              Alert.alert("Error", "Could not delete this recurrence.");
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  }, [router, rule, userId]);

  usePreventRemove(isDirty && !allowRemoval, ({ data }) => {
    Alert.alert(
      "Discard changes?",
      "You have unsaved changes. Are you sure you want to leave this screen?",
      [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setAllowRemoval(true);
            requestAnimationFrame(() => {
              navigation.dispatch(data.action);
            });
          },
        },
      ],
    );
  });

  useEffect(() => {
    navigation.setOptions({
      title: "Edit Recurrence",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.accent,
      headerRight: () => {
        const canSave = isDirty && isValid && !isSaving;
        return (
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            hitSlop={20}
            style={({ pressed }) => ({
              opacity: !canSave ? 0.35 : pressed ? 0.7 : 1,
              minWidth: 32,
              height: 32,
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <IconSymbol name="checkmark" size={24} color={ui.accent} />
          </Pressable>
        );
      },
    });
  }, [
    handleSave,
    isDirty,
    isSaving,
    isValid,
    navigation,
    ui.accent,
    ui.bg,
    ui.text,
  ]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: ui.bg },
        ]}
      >
        <ActivityIndicator size="large" color={ui.accent} />
      </View>
    );
  }

  return (
    <ThemedView style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: ui.bg }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.formStack}>
          <View style={styles.heroBlock}>
            <View
              style={[
                styles.amountContainer,
                { backgroundColor: ui.surface, borderColor: ui.border },
              ]}
            >
              <ThemedText style={[styles.currencySymbol, { color: ui.text }]}>
                $
              </ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                onBlur={() => {
                  if (!amount) return;
                  const parsed = parseFloat(amount);
                  if (Number.isFinite(parsed)) setAmount(parsed.toFixed(2));
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={ui.mutedText}
                style={[styles.amountInput, { color: ui.text }]}
              />
            </View>
          </View>

          <View
            style={[
              styles.groupCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <View style={styles.inputRow}>
              <View style={styles.rowLeft}>
                <Feather name="repeat" size={18} color={ui.mutedText} />
                <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                  Name
                </ThemedText>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Recurring transaction"
                placeholderTextColor={ui.mutedText}
                style={[styles.rowInputRight, { color: ui.text }]}
              />
            </View>

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            <DateTimePickerField
              label="Next Run"
              value={parseLocalDate(nextRunDate)}
              onChange={(date) => setNextRunDate(toLocalISOString(date))}
              ui={ui}
              icon="calendar.badge.clock"
            />

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            <DateTimePickerField
              label="Ends On"
              value={parseLocalDate(endDate)}
              onChange={(date) => setEndDate(toLocalISOString(date))}
              ui={ui}
              icon="calendar"
              placeholder="Optional"
            />
          </View>

          <View
            style={[
              styles.groupCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <Pressable
              onPress={() => {
                setPendingRecurrenceFrequencySelection(null);
                router.push({
                  pathname: "/recurrence/[id]/frequency-select",
                  params: { id, frequency },
                });
              }}
              style={styles.inputRow}
            >
              <View style={styles.rowLeft}>
                <Feather name="clock" size={18} color={ui.mutedText} />
                <ThemedText style={[styles.rowLabel, { color: ui.text }]}>
                  Frequency
                </ThemedText>
              </View>
              <View style={styles.rowRight}>
                <ThemedText
                  style={[
                    styles.rowValueRight,
                    { color: ui.accent ?? ui.text, fontWeight: "600" },
                  ]}
                >
                  {frequency}
                </ThemedText>
                <Feather name="chevron-right" size={16} color={ui.mutedText} />
              </View>
            </Pressable>
          </View>

          <View
            style={[
              styles.groupCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/recurrence/[id]/category-select",
                  params: {
                    id,
                    ...(selectedCategory?.id
                      ? { currentCategoryId: String(selectedCategory.id) }
                      : {}),
                  },
                });
              }}
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
                <Feather name="chevron-right" size={16} color={ui.mutedText} />
              </View>
            </Pressable>

            <View style={styles.quickPickWrap}>
              <ThemedText style={[styles.quickPickLabel, { color: ui.mutedText }]}>
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
                        <Feather name={item.icon} size={22} color="#FFFFFF" />
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
                  onPress={() => {
                    router.push({
                      pathname: "/recurrence/[id]/category-select",
                      params: {
                        id,
                        ...(selectedCategory?.id
                          ? { currentCategoryId: String(selectedCategory.id) }
                          : {}),
                      },
                    });
                  }}
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
                    style={[styles.quickPickText, { color: ui.mutedText }]}
                  >
                    More
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={[styles.rowSeparator, { backgroundColor: ui.border }]} />

            <Pressable
              onPress={() => {
                if (!selectedCategory) {
                  Alert.alert("Category required", "Please select a category first.");
                  return;
                }
                router.push({
                  pathname: "/recurrence/[id]/subcategory-select",
                  params: {
                    id,
                    categoryId: String(selectedCategory.id),
                    ...(selectedCategory.category_name
                      ? { categoryName: selectedCategory.category_name }
                      : {}),
                    ...(selectedSubcategory?.id
                      ? { currentSubcategoryId: String(selectedSubcategory.id) }
                      : {}),
                  },
                });
              }}
              style={[styles.inputRow, !selectedCategory && { opacity: 0.55 }]}
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

            {selectedCategory && quickPickSubcategoryOptions.length > 0 ? (
              <View style={styles.quickPickWrap}>
                <ThemedText style={[styles.quickPickLabel, { color: ui.mutedText }]}>
                  Quick picks
                </ThemedText>
                <View style={styles.quickPickRow}>
                  {quickPickSubcategoryOptions.map((label) => {
                    const isSelected =
                      (selectedSubcategory?.category_name ?? "")
                        .trim()
                        .toLowerCase() === label.toLowerCase();
                    return (
                      <Pressable
                        key={label}
                        onPress={() => handleSuggestedSubcategory(label)}
                        style={({ pressed }) => [
                          styles.quickPickItem,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <View
                          style={[
                            styles.quickPickIcon,
                            {
                              backgroundColor: isSelected
                                ? (ui.accent ?? ui.text)
                                : ui.surface2,
                              borderWidth: isSelected ? 0 : StyleSheet.hairlineWidth,
                              borderColor: ui.border,
                            },
                          ]}
                        >
                          <Feather
                            name="layers"
                            size={22}
                            color={isSelected ? "#FFFFFF" : ui.mutedText}
                          />
                        </View>
                        <ThemedText
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={[styles.quickPickText, { color: ui.text }]}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => {
                      router.push({
                        pathname: "/recurrence/[id]/subcategory-select",
                        params: {
                          id,
                          categoryId: String(selectedCategory.id),
                          ...(selectedCategory.category_name
                            ? { categoryName: selectedCategory.category_name }
                            : {}),
                          ...(selectedSubcategory?.id
                            ? { currentSubcategoryId: String(selectedSubcategory.id) }
                            : {}),
                        },
                      });
                    }}
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
                      style={[styles.quickPickText, { color: ui.mutedText }]}
                    >
                      More
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={handleToggleStatus}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.72 : 1,
              },
              isSaving && styles.buttonDisabled,
            ]}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: ui.text }]}>
              {rule?.is_active === false ? "Resume Recurrence" : "Pause Recurrence"}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.72 : 1,
              },
              isSaving && styles.buttonDisabled,
            ]}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: ui.danger }]}>
              Delete Recurrence
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  formStack: {
    gap: 12,
  },
  heroBlock: {
    gap: 10,
    marginBottom: 10,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  rowInputRight: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    textAlign: "right",
    fontFamily: Tokens.font.family,
  },
  rowValueRight: {
    fontSize: 15,
    textAlign: "right",
    fontFamily: Tokens.font.family,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  buttonDisabled: {
    opacity: 0.5,
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
});
