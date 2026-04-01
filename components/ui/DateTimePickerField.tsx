import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { ThemedText } from "../themed-text";
import { Tokens } from "@/constants/authTokens";
import { IconSymbol } from "./icon-symbol";

interface DateTimePickerFieldProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    ui: any;
    hideLabel?: boolean;
    icon?: string;
    placeholder?: string;
    disabled?: boolean;
}

export function DateTimePickerField({
    label,
    value,
    onChange,
    ui,
    hideLabel,
    icon,
    placeholder,
    disabled = false,
}: DateTimePickerFieldProps) {
    const [inputValue, setInputValue] = React.useState("");
    const [isEditing, setIsEditing] = React.useState(false);
    const [showIOSPicker, setShowIOSPicker] = React.useState(false);

    const formatDate = React.useCallback((date?: Date | null) => {
        if (!date) return "";
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
        const year = `${date.getFullYear()}`;
        return `${month}/${day}/${year}`;
    }, []);

    const parseInput = React.useCallback((text: string): Date | null => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        if (trimmed.includes("-")) {
            const [y, m, d] = trimmed.split("-").map((part) => parseInt(part, 10));
            if (!y || !m || !d) return null;
            const date = new Date(y, m - 1, d);
            if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
            return date;
        }
        if (trimmed.includes("/")) {
            const [m, d, y] = trimmed.split("/").map((part) => parseInt(part, 10));
            if (!y || !m || !d) return null;
            const date = new Date(y, m - 1, d);
            if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
            return date;
        }
        return null;
    }, []);

    const displayValue = React.useMemo(() => {
        return isEditing ? inputValue : formatDate(value);
    }, [formatDate, inputValue, isEditing, value]);

    const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (selectedDate) {
            onChange(selectedDate);
            setInputValue(formatDate(selectedDate));
            setIsEditing(false);
        }
    };

    const showPicker = () => {
        if (disabled) return;
        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                value,
                onChange: onPickerChange,
                mode: "date",
            });
            return;
        }
        setShowIOSPicker(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.rowContainer}>
                {icon && <IconSymbol name={icon as any} size={20} color={ui.mutedText} style={{ marginRight: 12 }} />}
                {!hideLabel && <ThemedText style={[styles.rowLabel, { color: ui.text }]}>{label}</ThemedText>}

                <View style={styles.inputWrap}>
                    <TextInput
                        value={displayValue}
                        onChangeText={setInputValue}
                        placeholder={placeholder || "MM/DD/YYYY"}
                        placeholderTextColor={ui.mutedText}
                        keyboardType="numbers-and-punctuation"
                        editable={!disabled}
                        onFocus={() => {
                            if (!disabled) {
                                setIsEditing(true);
                                setInputValue(formatDate(value));
                            }
                        }}
                        onSubmitEditing={() => {
                            if (disabled) return;
                            const parsed = parseInput(inputValue);
                            if (parsed) {
                                onChange(parsed);
                                setInputValue(formatDate(parsed));
                                setIsEditing(false);
                            } else {
                                setInputValue(formatDate(value));
                                setIsEditing(false);
                            }
                        }}
                        onBlur={() => {
                            if (disabled) return;
                            const parsed = parseInput(inputValue);
                            if (parsed) {
                                onChange(parsed);
                                setInputValue(formatDate(parsed));
                            } else {
                                setInputValue(formatDate(value));
                            }
                            setIsEditing(false);
                        }}
                        style={[styles.input, { color: ui.text, fontFamily: Tokens.font.family }]}
                    />
                    <Pressable
                        onPress={showPicker}
                        style={[styles.calendarButton, disabled && { opacity: 0.4 }]}
                        hitSlop={8}
                        disabled={disabled}
                    >
                        <IconSymbol name="calendar.circle" size={18} color={ui.mutedText} />
                    </Pressable>
                </View>
            </View>

            {Platform.OS === "ios" && (
                <Modal transparent visible={showIOSPicker} animationType="fade" onRequestClose={() => setShowIOSPicker(false)}>
                    <Pressable style={styles.backdrop} onPress={() => setShowIOSPicker(false)} />
                    <View style={[styles.iosPickerCard, { backgroundColor: ui.surface2, borderColor: ui.border }]}>
                        <DateTimePicker
                            value={value || new Date()}
                            mode="date"
                            display="inline"
                            onChange={(event, selectedDate) => {
                                if (selectedDate) {
                                    onChange(selectedDate);
                                    setInputValue(formatDate(selectedDate));
                                }
                            }}
                            accentColor={ui.accent}
                        />
                        <Pressable onPress={() => setShowIOSPicker(false)} style={styles.doneButton}>
                            <ThemedText style={{ color: ui.accent, fontWeight: "600" }}>Done</ThemedText>
                        </Pressable>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    rowContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 52,
    },
    rowLabel: {
        fontSize: 15,
        color: undefined, // Uses default theme color
        flex: 1,
        fontFamily: Tokens.font.boldFamily ? Tokens.font.semiFamily : Tokens.font.family,
    },
    inputWrap: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
    },
    input: {
        flex: 1,
        fontSize: 15,
        textAlign: "right",
        paddingVertical: 0,
    },
    calendarButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    iosPickerCard: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 32,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 12,
    },
    doneButton: {
        alignSelf: "flex-end",
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
});
