import { parseLocalDate } from "@/utils/date";
import type { PlaidAccount } from "@/utils/plaid";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

// Using the AccountRow type from accounts/index.tsx
export type AccountRowFull = {
    id: string | number;
    profile_id?: string;
    created_at?: string | null;
    account_type: string | null;
    account_name: string | null;
    balance: number | null;
    credit_limit?: number | null;
    statement_duedate?: string | null;
    payment_duedate?: string | null;
    interest_rate?: number | null;
    currency?: string | null;
};

interface AccountDetailModalProps {
    visible: boolean;
    onClose: () => void;
    account: AccountRowFull | PlaidAccount | null;
    availableBalance?: number | null;
    onEdit?: (account: AccountRowFull) => void;
    onUnlink?: (account: PlaidAccount) => void;
    children?: React.ReactNode;
}

export function AccountDetailModal({
    visible,
    onClose,
    account,
    availableBalance,
    onEdit,
    onUnlink,
    children,
}: AccountDetailModalProps) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    if (!account) return null;

    const isPlaid = "account_id" in account;

    // Normalize data
    const balance = isPlaid ? (account as PlaidAccount).balances.current : (account as AccountRowFull).balance;
    const name = isPlaid ? (account as PlaidAccount).name : ((account as AccountRowFull).account_name || "Manual Account");

    // Type and subtype
    let typeDisplay = "Unknown";
    if (isPlaid) {
        const pa = account as PlaidAccount;
        if (pa.subtype) {
            typeDisplay = pa.subtype.charAt(0).toUpperCase() + pa.subtype.slice(1);
        } else if (pa.type) {
            typeDisplay = pa.type.charAt(0).toUpperCase() + pa.type.slice(1);
        }
    } else {
        const ma = account as AccountRowFull;
        if (ma.account_type) {
            typeDisplay = ma.account_type.charAt(0).toUpperCase() + ma.account_type.slice(1);
        }
    }

    const institution = isPlaid ? ((account as PlaidAccount).institution_name || "Plaid Bank") : "Setup Manually";
    const mask = isPlaid ? (account as PlaidAccount).mask : null;

    const limit = isPlaid ? (account as PlaidAccount).balances.limit : (account as AccountRowFull).credit_limit;
    const currency = isPlaid ? (account as PlaidAccount).balances.iso_currency_code : (account as AccountRowFull).currency;

    const paymentDate = !isPlaid ? (account as AccountRowFull).payment_duedate : null;
    const statementDate = !isPlaid ? (account as AccountRowFull).statement_duedate : null;
    const interestRate = !isPlaid ? (account as AccountRowFull).interest_rate : null;

    const ui = {
        surface: isDark ? "#121212" : "#ffffff",
        surface2: isDark ? "#1a1a1a" : "#f8f9fa",
        border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        text: isDark ? "#ffffff" : "#111111",
        mutedText: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
        accent: isDark ? "#1F6F5B" : "#1F6F5B",
        danger: "#FF3B30",
    };

    const formatMoney = (val: number | null | undefined) => {
        if (val === null || val === undefined) return "N/A";
        return new Intl.NumberFormat("en-CA", {
            style: "currency",
            currency: "CAD",
        }).format(Math.abs(val));
    };

    const formatDate = (val: string | null | undefined) => {
        if (!val) return "";
        const adjustedDate = parseLocalDate(val);
        return adjustedDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
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
                    <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Account Details</ThemedText>
                    <View style={styles.headerRight}>
                        <Pressable
                            onPress={onClose}
                            hitSlop={20}
                            style={[
                                styles.closeButton,
                                { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)" }
                            ]}
                        >
                            <Feather name="x" size={18} color={ui.text} />
                        </Pressable>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.heroSection}>
                        <ThemedText style={[styles.amount, { color: ui.text }]}>
                            {formatMoney(balance)}
                        </ThemedText>
                        <ThemedText style={[styles.accountName, { color: ui.text }]}>
                            {name}
                        </ThemedText>
                        <View style={styles.typeBadge}>
                            <ThemedText style={styles.typeText}>{typeDisplay}</ThemedText>
                        </View>
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
                        {availableBalance !== undefined && availableBalance !== null && (
                            <DetailRow label="Available Balance" value={formatMoney(availableBalance)} ui={ui} />
                        )}
                        <DetailRow label="Institution" value={institution} ui={ui} />
                        {mask && <DetailRow label="Account Number" value={`•••• ${mask}`} ui={ui} />}
                        {limit !== null && limit !== undefined && <DetailRow label="Credit Limit" value={formatMoney(limit)} ui={ui} />}
                        {currency && <DetailRow label="Currency" value={currency} ui={ui} />}

                        {paymentDate && <DetailRow label="Payment Due" value={formatDate(paymentDate)} ui={ui} />}
                        {statementDate && <DetailRow label="Statement Date" value={formatDate(statementDate)} ui={ui} />}
                        {interestRate !== null && interestRate !== undefined && <DetailRow label="Interest Rate" value={`${interestRate}%`} ui={ui} />}
                    </View>

                    {!isPlaid && onEdit && (
                        <Pressable
                            onPress={() => {
                                onEdit(account as AccountRowFull);
                            }}
                            style={[styles.actionButton, { backgroundColor: ui.accent }]}
                        >
                            <Feather name="edit-2" size={18} color="#FFFFFF" />
                            <ThemedText style={styles.actionButtonText}>Edit Account</ThemedText>
                        </Pressable>
                    )}

                    {isPlaid && onUnlink && (
                        <Pressable
                            onPress={() => {
                                onUnlink(account as PlaidAccount);
                            }}
                            style={[styles.actionButton, { backgroundColor: ui.surface, borderColor: ui.danger, borderWidth: 1 }]}
                        >
                            <Feather name="link-2" size={18} color={ui.danger} />
                            <ThemedText style={[styles.actionButtonText, { color: ui.danger }]}>Unlink Plaid Account</ThemedText>
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
    accountName: {
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
    },
    typeBadge: {
        backgroundColor: "rgba(31, 111, 91, 0.15)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 4,
    },
    typeText: {
        color: "#1F6F5B",
        fontSize: 12,
        fontWeight: "700",
    },
    infoCard: {
        borderRadius: 16,
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
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 14,
        gap: 8,
        marginTop: 8,
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
});
