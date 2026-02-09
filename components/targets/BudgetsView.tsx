import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { createBudget, deleteBudget, editBudget, listBudgets } from "@/utils/budgets";
import { listCategories } from "@/utils/categories";
import {
    type BudgetPeriod,
    type CategoryBudgetRow,
    createCategoryBudget,
    deleteCategoryBudget,
    getCategorySpending,
    listCategoryBudgets,
} from "@/utils/categoryBudgets";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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

// ── Types ──────────────────────────────────────────

type CategoryRow = {
    id: number;
    category_name: string | null;
};

type BudgetRow = {
    id: number;
    profile_id: string;
    budget_name: string;
    total_amount: number;
    start_date: string;
    end_date: string;
    created_at?: string;
};

/** Client-side model combining a category-budget link with computed spending. */
type CategoryBudgetWithSpending = CategoryBudgetRow & {
    spent: number;
    category_name: string;
};

/** Client-side model for a full budget with its category breakdown. */
type BudgetWithCategories = BudgetRow & {
    categoryBudgets: CategoryBudgetWithSpending[];
};

/** Local draft for a category limit before saving. */
type DraftCategoryLimit = {
    localKey: string;
    expense_category_id: number;
    category_name: string;
    limit_amount: number;
    budget_period: BudgetPeriod;
};

const PERIOD_OPTIONS: BudgetPeriod[] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

const PERIOD_LABEL: Record<BudgetPeriod, string> = {
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
};

// ── Component ──────────────────────────────────────

export function BudgetsView() {
    const { session } = useAuthContext();
    const userId = session?.user.id;
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    let tabBarHeight = 0;
    try {
        tabBarHeight = useBottomTabBarHeight();
    } catch {
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
            destructive: "#ff3b30",
        }),
        [isDark],
    );

    // ── Data state ─────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);
    const [budgets, setBudgets] = useState<BudgetWithCategories[]>([]);
    const [categories, setCategories] = useState<CategoryRow[]>([]);

    // ── Modal state ────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<BudgetWithCategories | null>(null);


    // Form fields
    const [budgetName, setBudgetName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Category-limit drafts
    const [drafts, setDrafts] = useState<DraftCategoryLimit[]>([]);
    const [draftCategoryId, setDraftCategoryId] = useState<number | null>(null);
    const [draftLimitAmount, setDraftLimitAmount] = useState("");
    const [draftPeriod, setDraftPeriod] = useState<BudgetPeriod>("monthly");

    // Overlay pickers
    const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
    const [periodPickerOpen, setPeriodPickerOpen] = useState(false);

    // ── Formatters ─────────────────────────────────
    const formatMoney = (n: number) =>
        new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

    // ── Data loading ───────────────────────────────
    const loadData = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const [budgetRows, catRows] = await Promise.all([
                listBudgets({ profile_id: userId }),
                listCategories({ profile_id: userId }),
            ]);
            setCategories(catRows as CategoryRow[]);

            const enriched: BudgetWithCategories[] = await Promise.all(
                (budgetRows as BudgetRow[]).map(async (b) => {
                    const cbRows = await listCategoryBudgets({ budget_id: b.id });
                    const withSpending = await Promise.all(
                        cbRows.map(async (cb) => {
                            const spent = await getCategorySpending({
                                profile_id: userId,
                                expense_category_id: cb.expense_category_id,
                                start_date: b.start_date,
                                end_date: b.end_date,
                            });
                            const cat = (catRows as CategoryRow[]).find(
                                (c) => c.id === cb.expense_category_id,
                            );
                            return {
                                ...cb,
                                spent,
                                category_name: cat?.category_name ?? "Unknown",
                            };
                        }),
                    );
                    return { ...b, categoryBudgets: withSpending };
                }),
            );
            setBudgets(enriched);
        } catch (e) {
            console.error("Budget load error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData]),
    );

    // ── Modal helpers ──────────────────────────────
    const openCreateModal = () => {
        setEditingBudget(null);
        setBudgetName("");
        setStartDate("");
        setEndDate("");
        setDrafts([]);
        resetDraftFields();
        setModalOpen(true);
    };

    const openEditModal = (b: BudgetWithCategories) => {
        setEditingBudget(b);
        setBudgetName(b.budget_name ?? "");
        setStartDate(b.start_date);
        setEndDate(b.end_date);
        setDrafts(
            b.categoryBudgets.map((cb) => ({
                localKey: cb.id.toString(),
                expense_category_id: cb.expense_category_id,
                category_name: cb.category_name,
                limit_amount: cb.limit_amount,
                budget_period: cb.budget_period,
            })),
        );
        resetDraftFields();
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingBudget(null);
    };

    const resetDraftFields = () => {
        setDraftCategoryId(null);
        setDraftLimitAmount("");
        setDraftPeriod("monthly");
    };

    // ── Draft category limits ──────────────────────
    const addDraft = () => {
        if (!draftCategoryId || !draftLimitAmount) {
            Alert.alert("Missing fields", "Select a category and enter a limit amount.");
            return;
        }
        const parsed = parseFloat(draftLimitAmount);
        if (isNaN(parsed) || parsed <= 0) {
            Alert.alert("Invalid amount", "Please enter a valid limit amount.");
            return;
        }
        const cat = categories.find((c) => c.id === draftCategoryId);
        setDrafts((prev) => [
            ...prev,
            {
                localKey: Date.now().toString(),
                expense_category_id: draftCategoryId,
                category_name: cat?.category_name ?? "Unknown",
                limit_amount: parsed,
                budget_period: draftPeriod,
            },
        ]);
        resetDraftFields();
    };

    const removeDraft = (key: string) => {
        setDrafts((prev) => prev.filter((d) => d.localKey !== key));
    };

    // ── Save / Delete ──────────────────────────────
    const handleSave = useCallback(async () => {
        if (!userId) return;
        const trimmedName = budgetName.trim();
        if (!trimmedName || !startDate.trim() || !endDate.trim()) {
            Alert.alert("Invalid Input", "Please fill in a name, start date, and end date.");
            return;
        }
        if (drafts.length === 0) {
            Alert.alert("No Categories", "Add at least one category limit.");
            return;
        }
        // Auto-calculate total amount from category limits
        const totalAmount = drafts.reduce((sum, d) => sum + d.limit_amount, 0);

        try {
            let budgetId: number;
            if (editingBudget) {
                await editBudget({
                    id: editingBudget.id,
                    profile_id: userId,
                    update: { budget_name: trimmedName, total_amount: totalAmount, start_date: startDate.trim(), end_date: endDate.trim() },
                });
                budgetId = editingBudget.id;

                // Remove old category-budgets then re-create
                for (const old of editingBudget.categoryBudgets) {
                    await deleteCategoryBudget({ id: old.id });
                }
            } else {
                const created = await createBudget({
                    profile_id: userId,
                    budget_name: trimmedName,
                    total_amount: totalAmount,
                    start_date: startDate.trim(),
                    end_date: endDate.trim(),
                });
                budgetId = (created as any).id;
            }

            // Insert category-budgets
            for (const d of drafts) {
                await createCategoryBudget({
                    budget_id: budgetId,
                    expense_category_id: d.expense_category_id,
                    limit_amount: d.limit_amount,
                    budget_period: d.budget_period,
                });
            }

            closeModal();
            await loadData();
        } catch (e) {
            console.error("Save budget error:", e);
            Alert.alert("Error", "Could not save budget.");
        }
    }, [userId, budgetName, startDate, endDate, drafts, editingBudget, loadData]);

    const handleDelete = useCallback(async () => {
        if (!userId || !editingBudget) return;
        Alert.alert("Delete Budget", "Are you sure? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        // Delete category-budgets first
                        for (const cb of editingBudget.categoryBudgets) {
                            await deleteCategoryBudget({ id: cb.id });
                        }
                        await deleteBudget({ id: editingBudget.id, profile_id: userId });
                        closeModal();
                        await loadData();
                    } catch (e) {
                        console.error("Delete budget error:", e);
                        Alert.alert("Error", "Could not delete budget.");
                    }
                },
            },
        ]);
    }, [userId, editingBudget, loadData]);

    // ── Render ──────────────────────────────────────
    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={ui.text} />
                }
            >
                {budgets.length === 0 ? (
                    <ThemedText style={{ textAlign: "center", marginTop: 24, opacity: 0.6 }}>
                        No budgets yet. Create one below!
                    </ThemedText>
                ) : (
                    budgets.map((budget) => (
                        <Pressable
                            key={budget.id}
                            onPress={() => openEditModal(budget)}
                            style={({ pressed }) => [
                                styles.card,
                                {
                                    backgroundColor: ui.surface2,
                                    borderColor: ui.border,
                                    opacity: pressed ? 0.7 : 1,
                                },
                            ]}
                        >
                            <View style={{ marginBottom: 8 }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                    <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
                                        {budget.budget_name || "Budget"}
                                    </ThemedText>
                                    <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
                                        {formatMoney(budget.total_amount)}
                                    </ThemedText>
                                </View>
                                <ThemedText style={{ opacity: 0.5, fontSize: 12 }}>
                                    {budget.start_date} → {budget.end_date}
                                </ThemedText>
                            </View>

                            {budget.categoryBudgets.map((cb) => {
                                const pct = cb.limit_amount > 0 ? (cb.spent / cb.limit_amount) * 100 : 0;
                                const over = cb.spent > cb.limit_amount;
                                return (
                                    <View key={cb.id} style={{ marginBottom: 10 }}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                                            <ThemedText style={{ fontSize: 14 }}>
                                                {cb.category_name}{" "}
                                                <ThemedText style={{ opacity: 0.5, fontSize: 11 }}>
                                                    ({PERIOD_LABEL[cb.budget_period]})
                                                </ThemedText>
                                            </ThemedText>
                                            <ThemedText
                                                style={{
                                                    fontSize: 13,
                                                    color: over ? "#ff3b30" : "#34C759",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {formatMoney(cb.spent)} / {formatMoney(cb.limit_amount)}
                                                {over ? "  ⚠ Over" : ""}
                                            </ThemedText>
                                        </View>
                                        <View
                                            style={{
                                                height: 6,
                                                backgroundColor: ui.surface,
                                                borderRadius: 3,
                                                overflow: "hidden",
                                            }}
                                        >
                                            <View
                                                style={{
                                                    height: "100%",
                                                    width: `${Math.min(pct, 100)}%`,
                                                    backgroundColor: over ? "#ff3b30" : "#34C759",
                                                }}
                                            />
                                        </View>
                                    </View>
                                );
                            })}
                        </Pressable>
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={openCreateModal}
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

            {/* ── Create / Edit Modal ───────────────── */}
            <Modal
                visible={modalOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeModal}
            >
                <ThemedView
                    style={{
                        flex: 1,
                        padding: 16,
                        paddingTop: 16 + insets.top,
                        paddingBottom: 16 + insets.bottom,
                        backgroundColor: ui.surface,
                    }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <ThemedText type="title">{editingBudget ? "Edit Budget" : "New Budget"}</ThemedText>
                        <Pressable onPress={closeModal}>
                            <ThemedText style={{ color: "#007AFF" }}>Cancel</ThemedText>
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
                        {/* Budget Name */}
                        <View style={styles.fieldGroup}>
                            <ThemedText type="defaultSemiBold">Budget Name</ThemedText>
                            <TextInput
                                value={budgetName}
                                onChangeText={setBudgetName}
                                placeholder="e.g. February Budget"
                                placeholderTextColor={ui.mutedText}
                                style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]}
                            />
                        </View>

                        {/* Start Date */}
                        <View style={styles.fieldGroup}>
                            <ThemedText type="defaultSemiBold">Start Date</ThemedText>
                            <TextInput
                                value={startDate}
                                onChangeText={setStartDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={ui.mutedText}
                                style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]}
                            />
                        </View>

                        {/* End Date */}
                        <View style={styles.fieldGroup}>
                            <ThemedText type="defaultSemiBold">End Date</ThemedText>
                            <TextInput
                                value={endDate}
                                onChangeText={setEndDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={ui.mutedText}
                                style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text }]}
                            />
                        </View>

                        {/* ── Category Limits Section ─────── */}
                        <View style={{ marginTop: 8 }}>
                            <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>Category Limits</ThemedText>

                            {/* Existing drafts */}
                            {drafts.map((d) => (
                                <View
                                    key={d.localKey}
                                    style={[
                                        styles.draftRow,
                                        { borderColor: ui.border, backgroundColor: ui.surface2 },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <ThemedText style={{ fontSize: 14 }}>{d.category_name}</ThemedText>
                                        <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
                                            {PERIOD_LABEL[d.budget_period]} • {formatMoney(d.limit_amount)}
                                        </ThemedText>
                                    </View>
                                    <Pressable onPress={() => removeDraft(d.localKey)} hitSlop={8}>
                                        <ThemedText style={{ color: ui.destructive, fontSize: 18, fontWeight: "700" }}>✕</ThemedText>
                                    </Pressable>
                                </View>
                            ))}

                            {/* Add new category limit */}
                            <View style={[styles.addSection, { borderColor: ui.border }]}>
                                {/* Category picker trigger */}
                                <Pressable
                                    onPress={() => setCategoryPickerOpen(true)}
                                    style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48 }]}
                                >
                                    <ThemedText style={{ color: draftCategoryId ? ui.text : ui.mutedText }}>
                                        {draftCategoryId
                                            ? categories.find((c) => c.id === draftCategoryId)?.category_name ?? "Unknown"
                                            : "Select category"}
                                    </ThemedText>
                                    <IconSymbol name="chevron.right" size={16} color={ui.mutedText} />
                                </Pressable>

                                {/* Period picker trigger */}
                                <Pressable
                                    onPress={() => setPeriodPickerOpen(true)}
                                    style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48, marginTop: 8 }]}
                                >
                                    <ThemedText>{PERIOD_LABEL[draftPeriod]}</ThemedText>
                                    <IconSymbol name="chevron.right" size={16} color={ui.mutedText} />
                                </Pressable>

                                {/* Limit amount */}
                                <TextInput
                                    value={draftLimitAmount}
                                    onChangeText={setDraftLimitAmount}
                                    keyboardType="numeric"
                                    placeholder="Limit amount"
                                    placeholderTextColor={ui.mutedText}
                                    style={[styles.input, { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text, marginTop: 8 }]}
                                />

                                {/* Add button */}
                                <Pressable
                                    onPress={addDraft}
                                    style={[styles.button, { backgroundColor: ui.text, marginTop: 10, alignSelf: "flex-start" }]}
                                >
                                    <ThemedText style={{ color: ui.surface, fontSize: 14, fontWeight: "600" }}>
                                        + Add Category
                                    </ThemedText>
                                </Pressable>
                            </View>
                        </View>

                        {/* Save button */}
                        <Pressable
                            onPress={handleSave}
                            style={[styles.button, { backgroundColor: ui.text, borderColor: ui.border, marginTop: 16, alignSelf: "center", width: "100%", alignItems: "center" }]}
                        >
                            <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
                                {editingBudget ? "Save Changes" : "Create Budget"}
                            </ThemedText>
                        </Pressable>

                        {/* Delete button */}
                        {editingBudget && (
                            <Pressable
                                onPress={handleDelete}
                                style={[styles.deleteAction, { borderColor: ui.border, backgroundColor: ui.surface, marginTop: 12 }]}
                            >
                                <ThemedText type="defaultSemiBold" style={{ color: ui.destructive }}>
                                    Delete Budget
                                </ThemedText>
                            </Pressable>
                        )}
                    </ScrollView>

                    {/* ── Category picker overlay ──── */}
                    {categoryPickerOpen && (
                        <Pressable
                            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", zIndex: 100 }]}
                            onPress={() => setCategoryPickerOpen(false)}
                        >
                            <ThemedView
                                style={[styles.pickerContent, { backgroundColor: ui.surface, borderColor: ui.border }]}
                                onStartShouldSetResponder={() => true}
                            >
                                <View style={styles.pickerHeader}>
                                    <ThemedText type="defaultSemiBold">Select Category</ThemedText>
                                    <Pressable onPress={() => setCategoryPickerOpen(false)}>
                                        <ThemedText style={{ color: "#007AFF" }}>Done</ThemedText>
                                    </Pressable>
                                </View>
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {categories.map((cat) => (
                                        <Pressable
                                            key={cat.id}
                                            onPress={() => {
                                                setDraftCategoryId(cat.id);
                                                setCategoryPickerOpen(false);
                                            }}
                                            style={({ pressed }) => [
                                                styles.pickerOption,
                                                {
                                                    backgroundColor: draftCategoryId === cat.id ? ui.surface2 : "transparent",
                                                    opacity: pressed ? 0.7 : 1,
                                                    borderColor: ui.border,
                                                },
                                            ]}
                                        >
                                            <ThemedText>{cat.category_name}</ThemedText>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </ThemedView>
                        </Pressable>
                    )}

                    {/* ── Period picker overlay ──── */}
                    {periodPickerOpen && (
                        <Pressable
                            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", zIndex: 100 }]}
                            onPress={() => setPeriodPickerOpen(false)}
                        >
                            <ThemedView
                                style={[styles.pickerContent, { backgroundColor: ui.surface, borderColor: ui.border }]}
                                onStartShouldSetResponder={() => true}
                            >
                                <View style={styles.pickerHeader}>
                                    <ThemedText type="defaultSemiBold">Select Period</ThemedText>
                                    <Pressable onPress={() => setPeriodPickerOpen(false)}>
                                        <ThemedText style={{ color: "#007AFF" }}>Done</ThemedText>
                                    </Pressable>
                                </View>
                                {PERIOD_OPTIONS.map((p) => (
                                    <Pressable
                                        key={p}
                                        onPress={() => {
                                            setDraftPeriod(p);
                                            setPeriodPickerOpen(false);
                                        }}
                                        style={({ pressed }) => [
                                            styles.pickerOption,
                                            {
                                                backgroundColor: draftPeriod === p ? ui.surface2 : "transparent",
                                                opacity: pressed ? 0.7 : 1,
                                                borderColor: ui.border,
                                            },
                                        ]}
                                    >
                                        <ThemedText>{PERIOD_LABEL[p]}</ThemedText>
                                    </Pressable>
                                ))}
                            </ThemedView>
                        </Pressable>
                    )}
                </ThemedView>
            </Modal>
        </View>
    );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
        gap: 12,
        paddingBottom: 80,
    },
    card: {
        padding: 14,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    fab: {
        position: "absolute",
        right: 4,
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
    formContent: {
        gap: 12,
        paddingBottom: 24,
    },
    fieldGroup: {
        gap: 6,
    },
    input: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    button: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
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
    draftRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 8,
    },
    addSection: {
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderStyle: "dashed",
        marginTop: 8,
    },
    pickerContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        borderTopWidth: 1,
        paddingBottom: 40,
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    pickerOption: {
        padding: 16,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
});
