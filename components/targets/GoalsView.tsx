import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listAccounts } from "@/utils/accounts";
import { createGoal, deleteGoal, editGoal, listGoals } from "@/utils/goals";
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
    useColorScheme
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type GoalRow = {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number | null;
    target_date: string | null;
    linked_account: number | null;
    created_at?: string;
};

type AccountRow = {
    id: number;
    account_name: string | null;
    account_type: string | null;
    balance: number | null;
    currency: string | null;
};

export function GoalsView() {
    const { session } = useAuthContext();
    const userId = session?.user.id;
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Dynamic tab bar height
    let tabBarHeight = 0;
    try {
        tabBarHeight = useBottomTabBarHeight();
    } catch (e) {
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
    const [accounts, setAccounts] = useState<AccountRow[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(null);
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);
    const [allocationAmount, setAllocationAmount] = useState("");

    const loadGoals = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await listGoals({ profile_id: userId });

            // Ensure data conforms to GoalRow type
            const formattedGoals: GoalRow[] = (data || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                linked_account: item.linked_account,
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

    const loadAccounts = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await listAccounts({ profile_id: userId });
            setAccounts(data as AccountRow[]);
        } catch (error) {
            console.error("Error loading accounts:", error);
        }
    }, [userId]);

    useFocusEffect(
        useCallback(() => {
            loadGoals();
            loadAccounts();
        }, [loadGoals, loadAccounts])
    );

    const handleSaveGoal = useCallback(async () => {
        if (!userId) return;
        const trimmedName = name.trim();
        const parsedTarget = parseFloat(targetAmount);
        const linkedAccount = selectedAccount?.id;

        if (!trimmedName || isNaN(parsedTarget) || !linkedAccount) {
            Alert.alert("Invalid Input", "Please enter a valid name, target amount, and select an account.");
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
                        linked_account: linkedAccount,
                    },
                });
            } else {
                await createGoal({
                    profile_id: userId,
                    name: trimmedName,
                    target_amount: parsedTarget,
                    current_amount: currentAmount ? parseFloat(currentAmount) : 0,
                    target_date: targetDate.trim() || null,
                    linked_account: linkedAccount,
                });
            }
            closeModal();
            await loadGoals();
        } catch (error) {
            console.error("Error saving goal:", error);
            Alert.alert("Error", "Could not save goal.");
        }
    }, [userId, name, targetAmount, currentAmount, targetDate, selectedAccount, editingGoal, loadGoals]);

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
        setSelectedAccount(null);
        setCreateModalOpen(true);
    };

    const openEditModal = (goal: GoalRow) => {
        setEditingGoal(goal);
        setName(goal.name);
        setTargetAmount(goal.target_amount.toString());
        setCurrentAmount(goal.current_amount ? goal.current_amount.toString() : "");
        setTargetDate(goal.target_date || "");

        const accountMatch = accounts.find(a => a.id === goal.linked_account);
        setSelectedAccount(accountMatch || null);

        setCreateModalOpen(true);
    };

    const closeModal = () => {
        setCreateModalOpen(false);
        setEditingGoal(null);
        setName("");
        setTargetAmount("");
        setCurrentAmount("");
        setTargetDate("");
        setSelectedAccount(null);
    };

    const handleAllocate = () => {
        const amountToAdd = parseFloat(allocationAmount);
        if (isNaN(amountToAdd) || amountToAdd <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount to allocate.");
            return;
        }

        const current = parseFloat(currentAmount) || 0;
        setCurrentAmount((current + amountToAdd).toString());
        setAllocationAmount("");
        setAllocationModalOpen(false);
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
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                {goal.target_date && (
                                    <ThemedText style={{ opacity: 0.6, fontSize: 12 }}>
                                        Target: {goal.target_date}
                                    </ThemedText>
                                )}
                                {goal.linked_account && (
                                    <ThemedText style={{ opacity: 0.6, fontSize: 12 }}>
                                        Account: {accounts.find(a => a.id === goal.linked_account)?.account_name || 'Unknown'}
                                    </ThemedText>
                                )}
                            </View>
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
                        bottom: fabBottom,
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

                        {editingGoal && (
                            <View style={styles.fieldGroup}>
                                <ThemedText type="defaultSemiBold">Current Amount</ThemedText>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <ThemedText style={{ fontSize: 18, marginTop: 4 }}>
                                        ${parseFloat(currentAmount || "0").toFixed(2)}
                                    </ThemedText>
                                    <Pressable
                                        onPress={() => setAllocationModalOpen(true)}
                                        style={[styles.button, { backgroundColor: ui.text, marginTop: 0 }]}
                                    >
                                        <ThemedText style={{ color: ui.surface, fontSize: 14 }}>Allocate Funds</ThemedText>
                                    </Pressable>
                                </View>
                            </View>
                        )}

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

                        <View style={styles.fieldGroup}>
                            <ThemedText type="defaultSemiBold">Linked Account</ThemedText>
                            <Pressable
                                onPress={() => setAccountModalOpen(true)}
                                style={[
                                    styles.input,
                                    {
                                        borderColor: ui.border,
                                        backgroundColor: ui.surface2,
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        minHeight: 48,
                                    },
                                ]}
                            >
                                <ThemedText style={{ color: selectedAccount ? ui.text : ui.mutedText }}>
                                    {selectedAccount ? selectedAccount.account_name : "Select an account"}
                                </ThemedText>
                                <IconSymbol name="chevron.right" size={16} color={ui.mutedText} />
                            </Pressable>
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

                    {/* Account Selection Overlay - Moved inside Create Modal to avoid iOS sibling modal issues */}
                    {accountModalOpen && (
                        <Pressable
                            style={[
                                StyleSheet.absoluteFill,
                                { backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", zIndex: 100 }
                            ]}
                            onPress={() => setAccountModalOpen(false)}
                        >
                            <ThemedView
                                style={[
                                    styles.accountPickerContent,
                                    { backgroundColor: ui.surface, borderColor: ui.border },
                                ]}
                                onStartShouldSetResponder={() => true}
                            >
                                <View style={styles.accountPickerHeader}>
                                    <ThemedText type="defaultSemiBold">Select Account</ThemedText>
                                    <Pressable onPress={() => setAccountModalOpen(false)}>
                                        <ThemedText style={{ color: "#007AFF" }}>Done</ThemedText>
                                    </Pressable>
                                </View>
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {accounts.map((account) => (
                                        <Pressable
                                            key={account.id}
                                            onPress={() => {
                                                setSelectedAccount(account);
                                                setAccountModalOpen(false);
                                            }}
                                            style={({ pressed }) => [
                                                styles.accountOption,
                                                {
                                                    backgroundColor:
                                                        selectedAccount?.id === account.id
                                                            ? ui.surface2
                                                            : "transparent",
                                                    opacity: pressed ? 0.7 : 1,
                                                    borderColor: ui.border,
                                                },
                                            ]}
                                        >
                                            <ThemedText>{account.account_name}</ThemedText>
                                            <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
                                                {account.account_type} • ${account.balance}
                                            </ThemedText>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </ThemedView>
                        </Pressable>
                    )}

                    {/* Allocate Funds Overlay - Moved inside Create Modal to avoid iOS sibling modal issues */}
                    {allocationModalOpen && (
                        <Pressable
                            style={[
                                StyleSheet.absoluteFill,
                                { backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 100 }
                            ]}
                            onPress={() => setAllocationModalOpen(false)}
                        >
                            <ThemedView
                                style={{
                                    backgroundColor: ui.surface,
                                    padding: 24,
                                    width: '85%',
                                    borderRadius: 16,
                                    elevation: 5,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 3.84,
                                }}
                                onStartShouldSetResponder={() => true}
                            >
                                <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Allocate Funds</ThemedText>
                                <ThemedText style={{ marginBottom: 16, opacity: 0.7 }}>
                                    Allocation will increase the goal's current amount.
                                    {selectedAccount ? `\nFrom: ${selectedAccount.account_name}` : ""}
                                </ThemedText>

                                <TextInput
                                    value={allocationAmount}
                                    onChangeText={setAllocationAmount}
                                    keyboardType="numeric"
                                    placeholder="Amount (e.g. 50.00)"
                                    placeholderTextColor={ui.mutedText}
                                    autoFocus
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: ui.border,
                                            backgroundColor: ui.surface2,
                                            color: ui.text,
                                            marginBottom: 16
                                        },
                                    ]}
                                />

                                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                                    <Pressable
                                        onPress={() => setAllocationModalOpen(false)}
                                        style={{ padding: 10 }}
                                    >
                                        <ThemedText style={{ color: ui.mutedText }}>Cancel</ThemedText>
                                    </Pressable>
                                    <Pressable
                                        onPress={handleAllocate}
                                        style={{ padding: 10, backgroundColor: ui.text, borderRadius: 8 }}
                                    >
                                        <ThemedText style={{ color: ui.surface, fontWeight: "600" }}>Allocate</ThemedText>
                                    </Pressable>
                                </View>
                            </ThemedView>
                        </Pressable>
                    )}
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    accountPickerContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        borderTopWidth: 1,
        paddingBottom: 40,
    },
    accountPickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    accountOption: {
        padding: 16,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
});


