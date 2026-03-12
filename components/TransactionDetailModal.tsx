import { parseLocalDate } from "@/utils/date";
import type { PlaidTransaction } from "@/utils/plaid";
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useColorScheme,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

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

export type AccountRow = {
    id: number;
    account_name: string | null;
    account_type: string | null;
    balance: number | null;
    currency: string | null;
};

interface TransactionDetailModalProps {
    visible: boolean;
    onClose: () => void;
    transaction: ExpenseRow | PlaidTransaction | null;
    accounts?: AccountRow[];
    onEdit?: (expense: ExpenseRow) => void;
    children?: React.ReactNode;
}

export function TransactionDetailModal({
    visible,
    onClose,
    transaction,
    accounts = [],
    onEdit,
    children,
}: TransactionDetailModalProps) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = useTheme();
    const isDark = colorScheme === "dark";
    const isAndroid = Platform.OS === 'android';

    if (!transaction) return null;

    const isPlaid = "transaction_id" in transaction;

    // Normalize data
    const amount = isPlaid ? (transaction as PlaidTransaction).amount : (transaction as ExpenseRow).amount;
    const name = isPlaid
        ? ((transaction as PlaidTransaction).merchant_name || (transaction as PlaidTransaction).name)
        : ((transaction as ExpenseRow).description || "Manual Transaction");

    const dateStr = isPlaid ? (transaction as PlaidTransaction).date : ((transaction as ExpenseRow).transaction_date || (transaction as ExpenseRow).created_at);
    const institution = isPlaid ? (transaction as PlaidTransaction).institution_name : null;
    const isPending = isPlaid ? (transaction as PlaidTransaction).pending : false;

    let accountInfo = "Manual Entry";
    if (isPlaid) {
        accountInfo = `${(transaction as PlaidTransaction).account_name || ""} ••${(transaction as PlaidTransaction).account_mask || ""}`;
    } else {
        const manualTx = transaction as ExpenseRow;
        const matchedAccount = accounts.find(a => a.id === manualTx.account_id);
        if (matchedAccount) {
            accountInfo = matchedAccount.account_name || "Manual Account";
        }
    }

    const ui = {
        surface: isAndroid ? theme.colors.surface : (isDark ? "#1C1C1E" : "#FFFFFF"),
        surface2: isAndroid ? theme.colors.elevation.level2 : (isDark ? "#2C2C2E" : "#F2F2F7"), // standard gray matching iOS/Android
        border: isAndroid ? theme.colors.outlineVariant : (isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)"),
        text: isAndroid ? theme.colors.onSurface : (isDark ? "#FFFFFF" : "#000000"),
        mutedText: isAndroid ? theme.colors.onSurfaceVariant : (isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)"),
        accent: isAndroid ? theme.colors.primary : "#1F6F5B",
        danger: isAndroid ? theme.colors.error : "#FF3B30",
    };

    const formatMoney = (val: number | null) => {
        return new Intl.NumberFormat("en-CA", {
            style: "currency",
            currency: "CAD",
        }).format(Math.abs(val ?? 0));
    };

    const formatDate = (val: string | null | undefined) => {
        if (!val) return "";
        const date = parseLocalDate(val);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <ThemedView style={[
                styles.container,
                {
                    backgroundColor: ui.surface,
                    paddingTop: Platform.OS === 'ios' ? 8 : (insets.top + 16),
                    paddingBottom: insets.bottom + 16,
                }
            ]}>
                <View style={[styles.header, { borderBottomColor: "transparent" }]}>
                    <View style={styles.headerLeft} />
                    <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Details</ThemedText>
                    <View style={styles.headerRight}>
                        <Pressable
                            onPress={onClose}
                            hitSlop={20}
                            style={[
                                styles.closeButton,
                                { backgroundColor: isAndroid ? theme.colors.surfaceVariant : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)") }
                            ]}
                        >
                            <Feather name="x" size={18} color={ui.text} />
                        </Pressable>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.heroSection}>
                        <ThemedText style={[styles.amount, { color: ui.text }]}>
                            {formatMoney(amount)}
                        </ThemedText>
                        <ThemedText style={[styles.merchantName, { color: ui.text }]}>
                            {name}
                        </ThemedText>
                        {isPending && (
                            <View style={styles.pendingBadge}>
                                <ThemedText style={styles.pendingText}>PENDING</ThemedText>
                            </View>
                        )}
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
                        <DetailRow label="Date" value={formatDate(dateStr)} ui={ui} />
                        <DetailRow label="Account" value={accountInfo} ui={ui} />
                        {institution && <DetailRow label="Institution" value={institution} ui={ui} />}
                        {isPlaid && (transaction as PlaidTransaction).category && (
                            <DetailRow
                                label="Categories"
                                value={(transaction as PlaidTransaction).category?.join(", ") || "None"}
                                ui={ui}
                            />
                        )}
                        <DetailRow label="Source" value={isPlaid ? "Plaid Synchronization" : "Manual Transaction"} ui={ui} />
                    </View>

                    {!isPlaid && onEdit && (
                        <Pressable
                            onPress={() => {
                                onEdit(transaction as ExpenseRow);
                            }}
                            style={[styles.editButton, { backgroundColor: ui.accent }]}
                        >
                            <Feather name="edit-2" size={18} color={isAndroid ? theme.colors.onPrimary : "#FFFFFF"} />
                            <ThemedText style={[styles.editButtonText, { color: isAndroid ? theme.colors.onPrimary : "#FFFFFF" }]}>Edit Transaction</ThemedText>
                        </Pressable>
                    )}
                </ScrollView>
            </ThemedView>
            {children}
        </Modal>
    );
}

function DetailRow({ label, value, ui }: { label: string; value: string; ui: any }) {
    return (
        <View style={[styles.detailRow, { borderBottomColor: ui.border }]}>
            <ThemedText style={[styles.detailLabel, { color: ui.mutedText }]}>{label}</ThemedText>
            <ThemedText style={[styles.detailValue, { color: ui.text }]}>{value}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    headerTitle: {
        fontSize: 17,
        flex: 1,
        textAlign: "center",
    },
    headerLeft: {
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
    scrollContent: {
        padding: 24,
        gap: 24,
    },
    heroSection: {
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
    },
    amount: {
        fontSize: 48,
        fontWeight: "800",
        lineHeight: 56,
        paddingVertical: 8,
    },
    merchantName: {
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
    },
    pendingBadge: {
        backgroundColor: "rgba(255,149,0,0.15)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 4,
    },
    pendingText: {
        color: "#FF9500",
        fontSize: 12,
        fontWeight: "700",
    },
    infoCard: {
        borderRadius: 30,
        borderWidth: 1,
        overflow: "hidden",
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: "500",
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "600",
        flex: 1,
        textAlign: "right",
        marginLeft: 16,
    },
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 30,
        gap: 8,
        marginTop: 8,
    },
    editButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
});
