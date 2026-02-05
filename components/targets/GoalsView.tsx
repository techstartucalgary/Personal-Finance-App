import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { createGoal, deleteGoal, editGoal, listGoals } from "@/utils/goals";
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
    useColorScheme
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type GoalRow = {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number | null;
    target_date: string | null;
    created_at?: string;
};

export function GoalsView() {
    const { session } = useAuthContext();
    const userId = session?.user.id;
    const insets = useSafeAreaInsets();
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
            destructive: "#ff3b30",
        }),
        [isDark]
    );

    const [isLoading, setIsLoading] = useState(false);
    const [goals, setGoals] = useState<GoalRow[]>([]);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [currentAmount, setCurrentAmount] = useState("");
    const [targetDate, setTargetDate] = useState("");

    const loadGoals = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await listGoals({ profile_id: userId });

            // Ensure data conforms to GoalRow type
            const formattedGoals: GoalRow[] = (data || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                target_amount: item.target_amount,
                current_amount: item.current_amount,
                target_date: item.target_date,
                created_at: item.created_at,
            }));

            setGoals(formattedGoals);
        } catch (error) {
            console.error("Error loading goals:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    const handleSaveGoal = useCallback(async () => {
        if (!userId) return;
        const trimmedName = name.trim();
        const parsedTarget = parseFloat(targetAmount);

        if (!trimmedName || isNaN(parsedTarget)) {
            Alert.alert("Invalid Input", "Please enter a valid name and target amount.");
            return;
        }

        try {
            if (editingGoal) {
                await editGoal({
                    id: editingGoal.id,
                    profile_id: userId,
                    update: {
                        name: trimmedName,
                        target_amount: parsedTarget,
                        current_amount: currentAmount ? parseFloat(currentAmount) : 0,
                        target_date: targetDate.trim() || null,
                    },
                });
            } else {
                await createGoal({
                    profile_id: userId,
                    name: trimmedName,
                    target_amount: parsedTarget,
                    current_amount: currentAmount ? parseFloat(currentAmount) : 0,
                    target_date: targetDate.trim() || null,
                });
            }
            closeModal();
            await loadGoals();
        } catch (error) {
            console.error("Error saving goal:", error);
            Alert.alert("Error", "Could not save goal.");
        }
    }, [userId, name, targetAmount, currentAmount, targetDate, editingGoal, loadGoals]);

    const handleDeleteGoal = useCallback(async () => {
        if (!userId || !editingGoal) return;
        Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteGoal({ id: editingGoal.id, profile_id: userId });
                        closeModal();
                        await loadGoals();
                    } catch (error) {
                        console.error("Error deleting goal:", error);
                        Alert.alert("Error", "Could not delete goal.");
                    }
                },
            },
        ]);
    }, [userId, editingGoal, loadGoals]);

    const openCreateModal = () => {
        setEditingGoal(null);
        setName("");
        setTargetAmount("");
        setCurrentAmount("");
        setTargetDate("");
        setCreateModalOpen(true);
    };

    const openEditModal = (goal: GoalRow) => {
        setEditingGoal(goal);
        setName(goal.name);
        setTargetAmount(goal.target_amount.toString());
        setCurrentAmount(goal.current_amount ? goal.current_amount.toString() : "");
        setTargetDate(goal.target_date || "");
        setCreateModalOpen(true);
    };

    const closeModal = () => {
        setCreateModalOpen(false);
        setEditingGoal(null);
        setName("");
        setTargetAmount("");
        setCurrentAmount("");
        setTargetDate("");
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={loadGoals}
                        tintColor={ui.text}
                    />
                }
            >
                {goals.length === 0 ? (
                    <ThemedText style={{ textAlign: "center", marginTop: 24, opacity: 0.6 }}>
                        No goals yet. Create one below!
                    </ThemedText>
                ) : (
                    goals.map((goal) => (
                        <Pressable
                            key={goal.id}
                            onPress={() => openEditModal(goal)}
                            style={({ pressed }) => [
                                styles.card,
                                {
                                    backgroundColor: ui.surface2,
                                    borderColor: ui.border,
                                    opacity: pressed ? 0.7 : 1,
                                },
                            ]}
                        >
                            <View style={{ marginBottom: 4 }}>
                                <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>{goal.name}</ThemedText>
                                <ThemedText type="default" style={{ opacity: 0.8, marginTop: 2 }}>
                                    ${goal.current_amount ?? 0} / ${goal.target_amount} ({Math.round(((goal.current_amount ?? 0) / goal.target_amount) * 100)}%)
                                </ThemedText>
                            </View>
                            {goal.target_date && (
                                <ThemedText style={{ opacity: 0.6, fontSize: 12 }}>
                                    Target: {goal.target_date}
                                </ThemedText>
                            )}
                            {/* Progress Bar Placeholder */}
                            <View
                                style={{
                                    height: 6,
                                    backgroundColor: ui.surface,
                                    borderRadius: 3,
                                    marginTop: 8,
                                    overflow: "hidden",
                                }}
                            >
                                <View
                                    style={{
                                        height: "100%",
                                        width: `${Math.min(
                                            ((goal.current_amount ?? 0) / goal.target_amount) * 100,
                                            100
                                        )}%`,
                                        backgroundColor: "#34C759", // Green
                                    }}
                                />
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            <Pressable
                onPress={openCreateModal}
                style={({ pressed }) => [
                    styles.fab,
                    {
                        backgroundColor: ui.text,
                        opacity: pressed ? 0.8 : 1,
                    },
                ]}
            >
                <IconSymbol name="plus" size={32} color={ui.surface} />
            </Pressable>

            <Modal
                visible={createModalOpen}
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
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                        }}
                    >
                        <ThemedText type="title">{editingGoal ? "Edit Goal" : "New Goal"}</ThemedText>
                        <Pressable onPress={closeModal}>
                            <ThemedText style={{ color: "#007AFF" }}>Cancel</ThemedText>
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.formContent}>
                        <View style={styles.fieldGroup}>
                            <ThemedText type="defaultSemiBold">Goal Name</ThemedText>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. New Laptop"
                                placeholderTextColor={ui.mutedText}
                                style={[
                                    styles.input,
                                    { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text },
                                ]}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText type="defaultSemiBold">Target Amount</ThemedText>
                            <TextInput
                                value={targetAmount}
                                onChangeText={setTargetAmount}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={ui.mutedText}
                                style={[
                                    styles.input,
                                    { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text },
                                ]}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText type="defaultSemiBold">Current Amount ({editingGoal ? "Update" : "Optional"})</ThemedText>
                            <TextInput
                                value={currentAmount}
                                onChangeText={setCurrentAmount}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={ui.mutedText}
                                style={[
                                    styles.input,
                                    { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text },
                                ]}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <ThemedText type="defaultSemiBold">Target Date (Optional)</ThemedText>
                            <TextInput
                                value={targetDate}
                                onChangeText={setTargetDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={ui.mutedText}
                                style={[
                                    styles.input,
                                    { borderColor: ui.border, backgroundColor: ui.surface2, color: ui.text },
                                ]}
                            />
                        </View>

                        <Pressable
                            onPress={handleSaveGoal}
                            style={[
                                styles.button,
                                {
                                    backgroundColor: ui.text,
                                    borderColor: ui.border,
                                    marginTop: 16,
                                    alignSelf: "center",
                                    width: "100%",
                                    alignItems: "center",
                                },
                            ]}
                        >
                            <ThemedText type="defaultSemiBold" style={{ color: ui.surface }}>
                                {editingGoal ? "Save Changes" : "Create Goal"}
                            </ThemedText>
                        </Pressable>

                        {editingGoal && (
                            <Pressable
                                onPress={handleDeleteGoal}
                                style={[
                                    styles.deleteAction,
                                    { borderColor: ui.border, backgroundColor: ui.surface, marginTop: 12 },
                                ]}
                            >
                                <ThemedText type="defaultSemiBold" style={{ color: ui.destructive }}>
                                    Delete Goal
                                </ThemedText>
                            </Pressable>
                        )}
                    </ScrollView>
                </ThemedView>
            </Modal>
        </View>
    );
}

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
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    fab: {
        position: "absolute",
        right: 4,
        bottom: 8,
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
        alignSelf: "flex-start",
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
});
