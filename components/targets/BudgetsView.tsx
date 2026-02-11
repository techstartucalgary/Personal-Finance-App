import { ThemedText } from "@/components/themed-text";
import React from "react";
import { StyleSheet, View } from "react-native";

export function BudgetsView() {
    return (
        <View style={styles.container}>
            <ThemedText>Budgets View Content</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
});
