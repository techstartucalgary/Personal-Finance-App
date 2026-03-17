import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SelectionModal } from "@/components/ui/SelectionModal";
import { DateTimePickerField } from "@/components/ui/DateTimePickerField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuthContext } from "@/hooks/use-auth-context";
import { listAccounts, type AccountRow } from "@/utils/accounts";
import { parseLocalDate, toLocalISOString } from "@/utils/date";
import { createGoal, deleteGoal, editGoal, listGoals } from "@/utils/goals";
import { getPlaidAccounts } from "@/utils/plaid";
import Feather from "@expo/vector-icons/Feather";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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
    View,
    useColorScheme
} from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type GoalRow = {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number | null;
    target_date: string | null;
    linked_account: number | null;
    linked_plaid_account: string | null;
    created_at?: string;
};

type SelectableAccount = {
    id: string | number;
    isPlaid: boolean;
    name: string;
    type: string | null;
    balance: number | null;
};

type GoalsViewProps = {
    filterAccountId?: string | number | null;
    refreshKey?: number;
    createRequested?: number;
    searchQuery?: string;
};

export function GoalsView({ filterAccountId = null, refreshKey = 0, createRequested = 0, searchQuery = "" }: GoalsViewProps) {
    const { session } = useAuthContext();
    const userId = session?.user.id;
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const theme = useTheme();
    const isAndroid = Platform.OS === "android";

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
            surface: isDark ? "#1C1C1E" : "#FFFFFF",
            surface2: isDark ? "#2C2C2E" : "#F2F2F7",
            border: isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)",
            text: isDark ? "#FFFFFF" : "#000000",
            mutedText: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
            backdrop: "rgba(0,0,0,0.45)",
            destructive: "#D32F2F",
            accent: isDark ? "#10B981" : "#059669",
            accentSoft: isDark ? "rgba(16,185,129,0.15)" : "rgba(5,150,105,0.1)",
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
    const [accounts, setAccounts] = useState<SelectableAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<SelectableAccount | null>(null);
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
                linked_plaid_account: item.linked_plaid_account,
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
            const manualData = await listAccounts({ profile_id: userId }) as AccountRow[];
            const selectableManual: SelectableAccount[] = manualData.map(a => ({
                id: a.id,
                isPlaid: false,
                name: a.account_name || "Unnamed",
                type: a.account_type,
                balance: a.balance
            }));

            const plaidData = await getPlaidAccounts();
            const selectablePlaid: SelectableAccount[] = plaidData.map(pa => ({
                id: pa.account_id,
                isPlaid: true,
                name: `${pa.name} (${pa.institution_name})`,
                type: pa.type,
                balance: pa.balances.current
            }));

            setAccounts([...selectableManual, ...selectablePlaid]);
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

    useEffect(() => {
        if (refreshKey > 0) {
            loadGoals();
            loadAccounts();
        }
    }, [refreshKey]);

    useEffect(() => {
        if (createRequested > 0) {
            openCreateModal();
        }
    }, [createRequested]);

    const handleSaveGoal = useCallback(async () => {
        if (!userId) return;
        const trimmedName = name.trim();
        const parsedTarget = parseFloat(targetAmount);

        const isPlaid = selectedAccount?.isPlaid;
        const linkedAccount = !isPlaid && selectedAccount ? (selectedAccount.id as number) : null;
        const linkedPlaidAccount = isPlaid && selectedAccount ? (selectedAccount.id as string) : null;

        if (!trimmedName || isNaN(parsedTarget) || (!linkedAccount && !linkedPlaidAccount)) {
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
                        linked_plaid_account: linkedPlaidAccount,
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
                    linked_plaid_account: linkedPlaidAccount,
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

        const accountMatch = accounts.find(a => {
            if (a.isPlaid) return a.id === goal.linked_plaid_account;
            return a.id === goal.linked_account;
        });
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

    const filteredGoals = useMemo(() => {
        let result = goals;
        if (filterAccountId !== null) {
            result = result.filter((g) => {
                // Check against both manual ID (number) or Plaid ID (string)
                return g.linked_account === filterAccountId || g.linked_plaid_account === filterAccountId;
            });
        }
        if (searchQuery) {
            result = result.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return result;
    }, [goals, filterAccountId, searchQuery]);

    return (
        <View style={styles.container}>
            <View style={styles.scrollContent}>
                {filteredGoals.length === 0 ? (
                    <ThemedText style={{ textAlign: "center", marginTop: 24, opacity: 0.6 }}>
                        {filterAccountId ? "No goals for this account." : "No goals yet. Create one below!"}
                    </ThemedText>
                ) : (
                    filteredGoals.map((goal) => (
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
                                {(goal.linked_account || goal.linked_plaid_account) && (
                                    <ThemedText style={{ opacity: 0.6, fontSize: 12, flexWrap: 'wrap', flex: 1, textAlign: 'right', marginLeft: 16 }}>
                                        Account: {accounts.find(a => a.isPlaid ? a.id === goal.linked_plaid_account : a.id === goal.linked_account)?.name || 'Unknown'}
                                    </ThemedText>
                                )}
                            </View>
                            {/* Progress Bar  */}
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
            </View>

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
                        paddingTop: Platform.OS === 'ios' ? 12 : (16 + insets.top),
                        paddingBottom: 16 + insets.bottom,
                        backgroundColor: ui.surface,
                    }}
                >
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLeft} />
                        <ThemedText type="defaultSemiBold" style={styles.modalHeaderTitle}>{editingGoal ? "Edit Goal" : "New Goal"}</ThemedText>
                        <View style={styles.modalHeaderRight}>
                            <Pressable
                                onPress={closeModal}
                                hitSlop={20}
                                style={[styles.modalCloseButton, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)" }]}
                            >
                                <Feather name="x" size={18} color={ui.text} />
                            </Pressable>
                        </View>
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
                                        style={[styles.button, { backgroundColor: ui.text, marginTop: 0, paddingVertical: 8 }]}
                                    >
                                        <ThemedText style={{ color: ui.surface, fontSize: 13, fontWeight: "600" }}>Allocate Funds</ThemedText>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        <DateTimePickerField
                            label="Target Date (Optional)"
                            value={parseLocalDate(targetDate)}
                            onChange={(date) => setTargetDate(toLocalISOString(date))}
                            ui={ui}
                        />

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
                                <ThemedText style={{ color: selectedAccount ? ui.text : ui.mutedText, flexWrap: 'wrap', flex: 1 }}>
                                    {selectedAccount ? selectedAccount.name : "Select an account"}
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
                                    { borderColor: ui.border, backgroundColor: ui.surface2 },
                                ]}
                            >
                                <ThemedText type="defaultSemiBold" style={{ color: ui.destructive }}>
                                    Delete Goal
                                </ThemedText>
                            </Pressable>
                        )}
                    </ScrollView>

                    {/* Account Selection Modal */}
                    <SelectionModal
                        visible={accountModalOpen}
                        onClose={() => setAccountModalOpen(false)}
                        title="Select Account"
                        ui={ui}
                    >
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
                                                ? ui.accentSoft
                                                : ui.surface2,
                                        opacity: pressed ? 0.7 : 1,
                                        borderColor: ui.border,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        borderRadius: 16,
                                    },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={{ flexWrap: 'wrap', marginBottom: 2, color: selectedAccount?.id === account.id ? ui.accent : ui.text }}>
                                        {account.name}{account.isPlaid ? " (Plaid)" : ""}
                                    </ThemedText>
                                    <ThemedText style={{ fontSize: 12, opacity: 0.6, color: selectedAccount?.id === account.id ? ui.accent : ui.text }}>
                                        {account.type} • ${account.balance}
                                    </ThemedText>
                                </View>
                                {selectedAccount?.id === account.id && (
                                    <IconSymbol name="checkmark" size={18} color={ui.accent} />
                                )}
                            </Pressable>
                        ))}
                    </SelectionModal>

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
                                    {selectedAccount ? `\nFrom: ${selectedAccount.name}` : ""}
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
        gap: 12,
        paddingBottom: 80,
    },
    card: {
        padding: 12,
        borderRadius: 20,
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
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    button: {
        alignSelf: "flex-start",
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    accountOption: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
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


