//import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo } from "react";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

import { SplashScreenController } from "@/components/splash-screen-controller";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AuthProvider from "@/providers/auth-provider";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// This component handles the protection logic
function ProtectedLayout() {
  const { session, isLoading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const authRoute = segments[1] ?? "";
    const inOnboardingFlow = authRoute.startsWith("onboarding-");

    const metadata = session?.user?.user_metadata as
      | Record<string, any>
      | undefined;
    const onboardingComplete =
      metadata?.onboarding_complete ??
      metadata?.onboardingComplete ??
      true;
    const needsOnboarding = onboardingComplete === false;

    if (session) {
      if (needsOnboarding) {
        if (!inAuthGroup || !inOnboardingFlow) {
          router.replace("/(auth)/onboarding-profile");
        }
        return;
      }

      if (inAuthGroup) {
        router.replace("/(tabs)/dashboard");
      }
      return;
    }

    if (!inAuthGroup) {
      router.replace("/(auth)/onboarding-start");
    }
  }, [session, isLoading, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="account/[accountId]" options={{ headerShown: true }} />
      <Stack.Screen name="account-edit" options={{ headerShown: true }} />
      <Stack.Screen
        name="add-account-source"
        options={{
          presentation: "pageSheet",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="transaction-add"
        options={{
          presentation: "pageSheet",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="goal-add"
        options={{
          presentation: "pageSheet",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="goal/[id]"
        options={{
          presentation: "card",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="transaction/[id]"
        options={{
          presentation: "card",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="transaction-detail/[id]"
        options={{
          presentation: "card",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          presentation: "card",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{
          presentation: "card",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    "Avenir LT Std 55 Roman": require("../assets/fonts/AvenirLTStd-Roman.otf"),
    "Avenir LT Std 55 Oblique": require("../assets/fonts/AvenirLTStd-Oblique.otf"),
    "Avenir LT Std 65 Medium": require("../assets/fonts/AvenirLTStd-Medium.otf"),
    "Avenir LT Std 85 Heavy": require("../assets/fonts/AvenirLTStd-Heavy.otf"),
    "Avenir LT Std 95 Black": require("../assets/fonts/AvenirLTStd-Black.otf"),
    "Lato-Bold": require("../assets/fonts/Lato-Bold.ttf"),
    "Lato-Light": require("../assets/fonts/Lato-Light.ttf"),
  });
  const colorScheme = useColorScheme() ?? "light";

  // const { theme: m3Theme } = useMaterial3Theme();

  const paperTheme = useMemo(() => {
    const baseTheme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;

    // Material You disabled for now
    /*
    if (Platform.OS === "android" && m3Theme) {
      return {
        ...baseTheme,
        colors: colorScheme === "dark" ? m3Theme.dark : m3Theme.light,
      };
    }
    */


    // Custom neutral overrides to match iOS look on Android
    const isDark = colorScheme === 'dark';
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: isDark ? '#FFFFFF' : '#000000',
        onPrimary: isDark ? '#000000' : '#FFFFFF',
        primaryContainer: isDark ? '#1C1C1E' : '#F2F2F7',
        onPrimaryContainer: isDark ? '#FFFFFF' : '#000000',

        secondary: isDark ? '#FFFFFF' : '#000000',
        onSecondary: isDark ? '#000000' : '#FFFFFF',
        secondaryContainer: isDark ? '#3A3A3C' : '#E5E5EA',
        onSecondaryContainer: isDark ? '#FFFFFF' : '#000000',

        tertiary: isDark ? '#FFFFFF' : '#000000',
        onTertiary: isDark ? '#000000' : '#FFFFFF',
        tertiaryContainer: isDark ? '#1C1C1E' : '#F2F2F7',
        onTertiaryContainer: isDark ? '#FFFFFF' : '#000000',

        background: isDark ? '#000000' : '#FFFFFF',
        onBackground: isDark ? '#FFFFFF' : '#000000',

        surface: isDark ? '#1C1C1E' : '#F2F2F7',
        onSurface: isDark ? '#FFFFFF' : '#000000',
        surfaceVariant: isDark ? '#3A3A3C' : '#E5E5EA',
        onSurfaceVariant: isDark ? '#EBEBF5' : '#3C3C43', // Muted text/icons

        outline: isDark ? '#545458' : '#D1D1D6',
        outlineVariant: isDark ? '#3A3A3C' : '#E5E5EA',

        elevation: {
          ...baseTheme.colors.elevation,
          level2: isDark ? '#1C1C1E' : '#F2F2F7',
        }
      }
    };
  }, [colorScheme]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  const lightBg = "#FFFFFF";
  const darkBg = "#000000";
  const currentBg = colorScheme === "dark" ? darkBg : lightBg;

  const CustomDefaultTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: currentBg },
  };

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: currentBg },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}>
          <AuthProvider>
            <SplashScreenController />
            <ProtectedLayout />
            <StatusBar style="auto" />
          </AuthProvider>
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
