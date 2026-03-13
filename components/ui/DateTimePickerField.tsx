import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ThemedText } from "../themed-text";

interface DateTimePickerFieldProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    ui: any;
}

export function DateTimePickerField({ label, value, onChange, ui }: DateTimePickerFieldProps) {
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
            <ThemedText type="defaultSemiBold">{label}</ThemedText>

            {Platform.OS === "ios" ? (
                <DateTimePicker
                    value={value}
                    mode="date"
                    display="compact"
                    onChange={onPickerChange}
                    accentColor="#007AFF"
                    style={{ alignSelf: "flex-start" }}
                />
            ) : (
                <Pressable
                    onPress={showAndroidPicker}
                    style={[
                        styles.androidInput,
                        { borderColor: ui.border, backgroundColor: ui.surface2 },
                    ]}
                >
                    <Text style={{ color: ui.text }}>
                        {value.toLocaleDateString()}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 6,
    },
    androidInput: {
        borderWidth: 1,
        padding: 12,
        borderRadius: 12,
    },
});
