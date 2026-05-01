//import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

import { SplashScreenController } from "@/components/splash-screen-controller";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeUI } from "@/hooks/use-theme-ui";
import AuthProvider from "@/providers/auth-provider";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// This component handles the protection logic
function ProtectedLayout() {
  const { session, isLoading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const ui = useThemeUI();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const authRoute = segments[1] ?? "";
    const inOnboardingFlow = authRoute.startsWith("onboarding-");

    const metadata = session?.user?.user_metadata as
      | Record<string, any>
      | undefined;
    const onboardingComplete =
      metadata?.onboarding_complete ?? metadata?.onboardingComplete ?? true;
    const needsOnboarding = onboardingComplete === false;

    if (session) {
      if (needsOnboarding) {
        if (!inAuthGroup || !inOnboardingFlow) {
          router.replace("/(auth)/onboarding-profile");
        }
        return;
      }

      // Allow the MFA verify screen to stay active
      const onMfaVerify = segments[0] === "mfa-verify";
      if (inAuthGroup && !onMfaVerify) {
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
      <Stack.Screen
        name="account/[accountId]"
        options={{ headerShown: true }}
      />
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
          headerTitle: "Goal Details",
          presentation: "card",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontFamily: "Lato-Bold",
          },
        }}
      />
      <Stack.Screen
        name="goal-edit"
        options={{
          presentation: "pageSheet",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="budget-add"
        options={{
          presentation: "pageSheet",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="budget/[id]"
        options={{
          presentation: "card",
          headerTitle: "Budget Details",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="budget-edit/[id]"
        options={{
          presentation: "card",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="budget-edit-account-select"
        options={{
          presentation: "card",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="budget-edit-recurrence-select"
        options={{
          presentation: "card",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="budget-edit-expense-select"
        options={{
          presentation: "card",
          headerShown: true,
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
        name="recurrence/[id]"
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
        name="chat-ai"
        options={{
          presentation: "card",
          headerShown: true,
          title: "AI Chat",
          headerBackTitle: "Dashboard",
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerTintColor: ui.text,
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: ui.surface }
              : undefined,
        }}
      />
      <Stack.Screen
        name="mfa-setup"
        options={{
          presentation: "pageSheet",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="mfa-verify"
        options={{
          presentation: "card",
          headerShown: true,
          title: "Verify Identity",
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          presentation: "card",
          headerShown: true,
          title: "Settings",
        }}
      />
      <Stack.Screen
        name="change-password/index"
        options={{
          presentation: "card",
          headerShown: true,
          title: "Change Password",
          headerTransparent: Platform.OS === "ios",
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerTintColor: ui.text,
          headerShadowVisible: false,
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: ui.surface }
              : undefined,
        }}
      />
      <Stack.Screen
        name="change-password/verify"
        options={{
          presentation: "card",
          headerShown: true,
          title: "Verify Code",
          headerTransparent: Platform.OS === "ios",
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerTintColor: ui.text,
          headerShadowVisible: false,
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: ui.surface }
              : undefined,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          presentation: "card",
          headerShown: true,
          title: "Notifications",
          headerBackTitle: "Dashboard",
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerLargeTitle: false,
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: ui.surface }
              : undefined,
          headerTintColor: ui.text,
          headerRight: () => null,
        }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{
          presentation: "card",
          headerShown: true,
          title: "Notification Settings",
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerLargeTitle: false,
          headerTransparent: Platform.OS === "ios",
          headerShadowVisible: false,
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: ui.surface }
              : undefined,
          headerTintColor: ui.text,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    "Lato-Bold": require("../assets/fonts/Lato-Bold.ttf"),
    "Lato-Italic": require("../assets/fonts/Lato-Italic.ttf"),
    "Lato-Light": require("../assets/fonts/Lato-Light.ttf"),
    "Lato-Regular": require("../assets/fonts/Lato-Regular.ttf"),
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
    const isDark = colorScheme === "dark";
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: isDark ? "#FFFFFF" : "#000000",
        onPrimary: isDark ? "#000000" : "#FFFFFF",
        primaryContainer: isDark ? "#1C1C1E" : "#F2F2F7",
        onPrimaryContainer: isDark ? "#FFFFFF" : "#000000",

        secondary: isDark ? "#FFFFFF" : "#000000",
        onSecondary: isDark ? "#000000" : "#FFFFFF",
        secondaryContainer: isDark ? "#3A3A3C" : "#E5E5EA",
        onSecondaryContainer: isDark ? "#FFFFFF" : "#000000",

        tertiary: isDark ? "#FFFFFF" : "#000000",
        onTertiary: isDark ? "#000000" : "#FFFFFF",
        tertiaryContainer: isDark ? "#1C1C1E" : "#F2F2F7",
        onTertiaryContainer: isDark ? "#FFFFFF" : "#000000",

        background: isDark ? "#000000" : "#FFFFFF",
        onBackground: isDark ? "#FFFFFF" : "#000000",

        surface: isDark ? "#1C1C1E" : "#F2F2F7",
        onSurface: isDark ? "#FFFFFF" : "#000000",
        surfaceVariant: isDark ? "#3A3A3C" : "#E5E5EA",
        onSurfaceVariant: isDark ? "#EBEBF5" : "#3C3C43", // Muted text/icons

        outline: isDark ? "#545458" : "#D1D1D6",
        outlineVariant: isDark ? "#3A3A3C" : "#E5E5EA",

        elevation: {
          ...baseTheme.colors.elevation,
          level2: isDark ? "#1C1C1E" : "#F2F2F7",
        },
      },
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
        <ThemeProvider
          value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
        >
          <AuthProvider>
            <SplashScreenController />
            <ProtectedLayout />
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          </AuthProvider>
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
