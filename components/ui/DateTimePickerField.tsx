import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ThemedText } from "../themed-text";
import { IconSymbol } from "./icon-symbol";

interface DateTimePickerFieldProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    ui: any;
    hideLabel?: boolean;
    icon?: string;
    placeholder?: string;
}

export function DateTimePickerField({ label, value, onChange, ui, hideLabel, icon, placeholder }: DateTimePickerFieldProps) {
    const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (selectedDate) {
            onChange(selectedDate);
        }
    };

    const showAndroidPicker = () => {
        DateTimePickerAndroid.open({
            value,
            onChange: onPickerChange,
            mode: "date",
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.rowContainer}>
                {icon && <IconSymbol name={icon as any} size={20} color={ui.mutedText} style={{ marginRight: 12 }} />}
                {!hideLabel && <ThemedText style={[styles.rowLabel, { color: ui.text }]}>{label}</ThemedText>}
                
                {Platform.OS === "ios" ? (
                    <View style={styles.pickerWrapper}>
                        {placeholder && !value && <ThemedText style={{ color: ui.mutedText, marginRight: 8 }}>{placeholder}</ThemedText>}
                        <DateTimePicker
                            value={value || new Date()}
                            mode="date"
                            display="compact"
                            onChange={onPickerChange}
                            accentColor={ui.accent}
                            style={{ alignSelf: "flex-end" }}
                        />
                    </View>
                ) : (
                    <Pressable
                        onPress={showAndroidPicker}
                        style={styles.pickerWrapper}
                    >
                        <Text style={{ color: ui.text, fontSize: 16 }}>
                            {value ? value.toLocaleDateString() : (placeholder || label)}
                        </Text>
                    </Pressable>
                )}
            </View>
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
        fontSize: 16,
        color: undefined, // Uses default theme color
        flex: 1,
    },
    pickerWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    androidInput: {
        borderWidth: 1,
        padding: 12,
        borderRadius: 12,
    },
});
