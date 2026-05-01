import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTabsTheme } from "@/constants/tabsTheme";
import { listCategories, type CategoryRow } from "@/utils/categories";

type BudgetExpenseSelectionScreenProps = {
  excludedCategoryIds: number[];
  userId?: string;
  onSelectCategory: (category: CategoryRow) => void;
};

export function BudgetExpenseSelectionScreen({
  excludedCategoryIds,
  userId,
  onSelectCategory,
}: BudgetExpenseSelectionScreenProps) {
  const navigation = useNavigation();
  const { ui } = useTabsTheme();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      title: "Add Expense",
      headerBackButtonDisplayMode: "minimal",
      headerTitleAlign: "center",
      headerTransparent: Platform.OS === "ios",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: Platform.OS === "ios" ? "transparent" : ui.bg,
      },
      headerTitleStyle: { color: ui.text },
      headerTintColor: ui.text,
    });
  }, [navigation, ui.bg, ui.text]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!userId) {
        setCategories([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const rows = await listCategories({ profile_id: userId });
        setCategories(rows ?? []);
      } catch (error) {
        console.error("Error loading budget expense categories:", error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, [userId]);

  const excludedIds = useMemo(
    () => new Set(excludedCategoryIds.map((id) => Number(id))),
    [excludedCategoryIds],
  );
  const availableCategories = useMemo(
    () => categories.filter((category) => !excludedIds.has(Number(category.id))),
    [categories, excludedIds],
  );

  return (
    <ThemedView style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: ui.surface, borderColor: ui.border }]}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={ui.text} />
            </View>
          ) : availableCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={{ color: ui.mutedText }}>
                No expense categories available.
              </ThemedText>
            </View>
          ) : (
            availableCategories.map((category, index) => (
              <React.Fragment key={category.id}>
                <Pressable
                  onPress={() => onSelectCategory(category)}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : 1 }]}
                >
                  <ThemedText style={[styles.title, { color: ui.text }]}>
                    {category.category_name ?? "Expense"}
                  </ThemedText>
                  <Feather name="plus" size={16} color={ui.text} />
                </Pressable>
                {index < availableCategories.length - 1 ? (
                  <View style={[styles.separator, { backgroundColor: ui.border }]} />
                ) : null}
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  row: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  emptyState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
});
