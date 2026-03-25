import { Stack } from "expo-router";
import React from "react";

export default function TransactionsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" options={{ title: "Transactions" }} />
        </Stack>
    );
}
