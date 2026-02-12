import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

import { SplashScreenController } from "@/components/splash-screen-controller";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AuthProvider from "@/providers/auth-provider";
import { useFonts } from "expo-font";

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
        router.replace("/(tabs)/accounts");
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
  });
  const colorScheme = useColorScheme() ?? "light";

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

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
