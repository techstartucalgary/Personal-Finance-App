import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

import { SplashScreenController } from "@/components/splash-screen-controller";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AuthProvider from "@/providers/auth-provider";

// This component handles the protection logic
function ProtectedLayout() {
  const { session, isLoading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (session && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [session, isLoading, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";

  return (
    <PaperProvider
      theme={colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <SplashScreenController />
          <ProtectedLayout />
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}
