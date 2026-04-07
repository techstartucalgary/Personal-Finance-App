import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
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
import { listExpenses } from "@/utils/expenses";
import { supabase } from "@/utils/supabase";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { useThemeUI } from "@/hooks/use-theme-ui";
import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View
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


type BudgetsViewProps = {
    filterAccountId?: string | number | null;
    refreshKey?: number;
    createRequested?: number;
    searchQuery?: string;
};

// ── Component ──────────────────────────────────────

export function BudgetsView({ filterAccountId = null, refreshKey = 0, createRequested = 0, searchQuery = "" }: BudgetsViewProps) {
    const { session } = useAuthContext();
    const userId = session?.user.id;
    const insets = useSafeAreaInsets();
    const ui = useThemeUI();

    const tabBarHeight = insets.bottom + 60;
    const fabBottom = tabBarHeight + 60;


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
    const loadData = useCallback(async (silent = false) => {
        if (!userId) return;
        
        const hasData = budgets.length > 0;
        if (!silent && !hasData) setIsLoading(true);

        try {
            // 1. Fetch metadata in parallel
            const [budgetRows, catRows, allExpenses, cbResp] = await Promise.all([
                listBudgets({ profile_id: userId }),
                listCategories({ profile_id: userId }),
                listExpenses({ profile_id: userId }),
                supabase.from("Expense_category_budget").select("*")
            ]);

            if (cbResp.error) throw cbResp.error;

            const bRows = budgetRows as BudgetRow[];
            const cRows = catRows as CategoryRow[];
            const eRows = (allExpenses as any[]) || [];
            const linkRows = (cbResp.data as CategoryBudgetRow[]) || [];

            setCategories(cRows);

            // 2. Build enriched budgets in memory
            const enriched: BudgetWithCategories[] = bRows.map((b) => {
                // Filter links for this budget
                const relevantLinks = linkRows.filter(link => link.budget_id === b.id);
                
                const withSpending = relevantLinks.map((cb) => {
                    // Calculate spending locally to avoid N+1 queries
                    const spent = eRows.filter((ex: any) => {
                        const dateToUse = ex.transaction_date || ex.created_at?.split("T")[0];
                        const inDateRange = dateToUse >= b.start_date && dateToUse <= b.end_date;
                        const matchesCategory = Number(ex.expense_categoryid) === Number(cb.expense_category_id);
                        const matchesAccount = filterAccountId === null || Number(ex.account_id) === Number(filterAccountId);
                        return inDateRange && matchesCategory && matchesAccount;
                    }).reduce((sum, ex: any) => sum + (ex.amount ?? 0), 0);

                    const cat = cRows.find((c) => c.id === cb.expense_category_id);
                    return {
                        ...cb,
                        spent,
                        category_name: cat?.category_name ?? "Unknown",
                    };
                });
                return { ...b, categoryBudgets: withSpending };
            });

            setBudgets(enriched);
        } catch (e) {
            console.error("Budget load error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [userId, filterAccountId, budgets.length]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData]),
    );

    useEffect(() => {
        if (refreshKey > 0) {
            loadData();
        }
    }, [refreshKey]);

    useEffect(() => {
        if (createRequested > 0) {
            openCreateModal();
        }
    }, [createRequested]);

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

    const filteredBudgets = useMemo(() => {
        if (!searchQuery) return budgets;
        return budgets.filter(b => b.budget_name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [budgets, searchQuery]);

    // ── Render ──────────────────────────────────────
    return (
        <View style={styles.container}>
            <View style={styles.scrollContent}>
                {filteredBudgets.length === 0 ? (
                    <ThemedText style={{ textAlign: "center", marginTop: 24, opacity: 0.6 }}>
                        No budgets yet. Create one below!
                    </ThemedText>
                ) : (
                    filteredBudgets.map((budget) => (
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
                                                backgroundColor: ui.surface2,
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
            </View>

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
                        paddingTop: Platform.OS === 'ios' ? 12 : (16 + insets.top),
                        paddingBottom: 16 + insets.bottom,
                        backgroundColor: ui.surface,
                    }}
                >
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLeft} />
                        <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>{editingBudget ? "Edit Budget" : "New Budget"}</ThemedText>
                        <View style={styles.modalHeaderRight}>
                            <Pressable
                                onPress={closeModal}
                                hitSlop={20}
                                style={[styles.modalCloseButton, { backgroundColor: ui.surface2 }]}
                            >
                                <Feather name="x" size={18} color={ui.text} />
                            </Pressable>
                        </View>
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
                        <DateTimePickerField
                            label="Start Date"
                            value={parseLocalDate(startDate)}
                            onChange={(date) => setStartDate(toLocalISOString(date))}
                            ui={ui}
                        />

                        {/* End Date */}
                        <DateTimePickerField
                            label="End Date"
                            value={parseLocalDate(endDate)}
                            onChange={(date) => setEndDate(toLocalISOString(date))}
                            ui={ui}
                        />

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
                                        <ThemedText style={{ color: ui.danger, fontSize: 18, fontWeight: "700" }}>✕</ThemedText>
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
                                    style={[styles.button, { backgroundColor: ui.text, marginTop: 10, alignSelf: "flex-start", paddingVertical: 8 }]}
                                >
                                    <ThemedText style={{ color: ui.surface, fontSize: 13, fontWeight: "600" }}>
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
                                style={[styles.deleteAction, { borderColor: ui.border, backgroundColor: ui.surface2 }]}
                            >
                                <ThemedText type="defaultSemiBold" style={{ color: ui.danger }}>
                                    Delete Budget
                                </ThemedText>
                            </Pressable>
                        )}
                    </ScrollView>

                    {/* ── Category picker modal ──── */}
                    <SelectionModal
                        visible={categoryPickerOpen}
                        onClose={() => setCategoryPickerOpen(false)}
                        title="Select Category"
                        ui={ui}
                    >
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
                    </SelectionModal>

                    {/* ── Period picker modal ──── */}
                    <SelectionModal
                        visible={periodPickerOpen}
                        onClose={() => setPeriodPickerOpen(false)}
                        title="Select Period"
                        ui={ui}
                    >
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
                    </SelectionModal>
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
        gap: 12,
        paddingBottom: 80,
    },
    card: {
        padding: 12,
        borderRadius: 20,
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
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    button: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
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
    draftRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 8,
    },
    addSection: {
        padding: 12,
        borderRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
        borderStyle: "dashed",
        marginTop: 8,
    },
    pickerOption: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    modalHeaderTitle: {
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
