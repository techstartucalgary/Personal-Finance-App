import { AndroidAppBar } from "@/components/ui/android-app-bar";
import { Stack } from "expo-router";
import React from "react";
import { Platform, useColorScheme } from "react-native";
import { useTheme } from "react-native-paper";

export default function AccountsLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const theme = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                ...(Platform.OS === "android"
                    ? {
                          header: ({ options }) => (
                              <AndroidAppBar 
                                title={options.title ?? ""} 
                                searchBarOptions={(options as any).headerSearchBarOptions}
                              />
                          ),
                      }
                    : {
                          headerLargeTitle: true,
                          headerTransparent: true,
                          headerShadowVisible: false,
                          headerLargeStyle: { backgroundColor: "transparent" },
                      }),
            }}
        >
            <Stack.Screen name="index" options={{ title: "Accounts" }} />
        </Stack>
    );
}
