import { CardStyleInterpolators } from "@react-navigation/stack";
import { Stack } from "expo-router/stack";
import React from "react";
import { Easing } from "react-native";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        cardStyle: { backgroundColor: "#ECECF1" },
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: {
            animation: "timing",
            config: {
              duration: 360,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            },
          },
          close: {
            animation: "timing",
            config: {
              duration: 320,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            },
          },
        },
      }}
    >
      <Stack.Screen name="onboarding-start" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
