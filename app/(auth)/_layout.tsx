import { CardStyleInterpolators } from "@react-navigation/stack";
import { Stack } from "expo-router/stack";
import React from "react";


export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        cardStyle: { backgroundColor: "#ECECF1" },
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      <Stack.Screen name="onboarding-start" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
