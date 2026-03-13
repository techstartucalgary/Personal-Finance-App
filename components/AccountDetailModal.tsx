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
import { useTheme } from "react-native-paper";
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
    const theme = useTheme();
    const isDark = colorScheme === "dark";
    const isAndroid = Platform.OS === 'android';

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
        surface: isDark ? "#1C1C1E" : "#FFFFFF",
        surface2: isDark ? "#2C2C2E" : "#F2F2F7",
        border: isDark ? "rgba(84,84,88,0.65)" : "rgba(60,60,67,0.29)",
        text: isDark ? "#FFFFFF" : "#000000",
        mutedText: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
        accent: isDark ? "#8CF2D1" : "#1F6F5B",
        danger: "#D32F2F",
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
                        {[
                            availableBalance !== undefined && availableBalance !== null && { label: "Available Balance", value: formatMoney(availableBalance) },
                            { label: "Institution", value: institution },
                            mask && { label: "Account Number", value: `•••• ${mask}` },
                            limit !== null && limit !== undefined && { label: "Credit Limit", value: formatMoney(limit) },
                            currency && { label: "Currency", value: currency },
                            paymentDate && { label: "Payment Due", value: formatDate(paymentDate) },
                            statementDate && { label: "Statement Date", value: formatDate(statementDate) },
                            interestRate !== null && interestRate !== undefined && { label: "Interest Rate", value: `${interestRate}%` },
                        ]
                            .filter(Boolean)
                            .map((row: any, index, array) => (
                                <DetailRow
                                    key={row.label}
                                    label={row.label}
                                    value={row.value}
                                    ui={ui}
                                    isLast={index === array.length - 1}
                                />
                            ))}
                    </View>

                    {!isPlaid && onEdit && (
                        <Pressable
                            onPress={() => {
                                onEdit(account as AccountRowFull);
                            }}
                            style={[styles.actionButton, { backgroundColor: ui.text, paddingVertical: 12, borderRadius: 24 }]}
                        >
                            <Feather name="edit-2" size={18} color={ui.surface} />
                            <ThemedText style={[styles.actionButtonText, { color: ui.surface }]}>Edit Account</ThemedText>
                        </Pressable>
                    )}

                    {isPlaid && onUnlink && (
                        <Pressable
                            onPress={() => {
                                onUnlink(account as PlaidAccount);
                            }}
                            style={[styles.actionButton, { backgroundColor: ui.surface2, borderColor: ui.border, borderWidth: 1, paddingVertical: 12, borderRadius: 24 }]}
                        >
                            <Feather name="link-2" size={18} color={ui.danger} />
                            <ThemedText style={[styles.actionButtonText, { color: ui.danger, fontSize: 15 }]}>Unlink Plaid Account</ThemedText>
                        </Pressable>
                    )}
                </ScrollView>
            </ThemedView>
            {children}
        </Modal>
    );
}

function DetailRow({ label, value, ui, isLast }: { label: string; value: string; ui: any; isLast?: boolean }) {
    return (
        <View style={[
            styles.detailRow,
            { borderBottomColor: ui.border },
            isLast && { borderBottomWidth: 0 }
        ]}>
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
        borderRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
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
        borderRadius: 30,
        gap: 8,
        marginTop: 8,
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
});
