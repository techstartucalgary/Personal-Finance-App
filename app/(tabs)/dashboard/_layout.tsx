import { IconSymbol } from "@/components/ui/icon-symbol";
import { AndroidAppBar } from "@/components/ui/android-app-bar";
import { Icon, IconButton } from "@expo/ui/jetpack-compose";
import Feather from "@expo/vector-icons/Feather";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, useColorScheme } from "react-native";
import { useTheme } from "react-native-paper";

export default function IndexLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const router = useRouter();
    const theme = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                ...(Platform.OS === "android"
                    ? {
                          header: ({ options, back, navigation }) => (
                              <AndroidAppBar
                                  title={options.title ?? ""}
                                  searchBarOptions={(options as any).headerSearchBarOptions}
                                  navigationIcon={
                                      back ? undefined : (
                                          <IconButton
                                              onClick={() =>
                                                  Alert.alert("Notifications", "You have no new notifications.")
                                              }
                                          >
                                              <Icon
                                                  source={require("@/assets/icons/notifications.xml")}
                                                  size={24}
                                              />
                                          </IconButton>
                                      )
                                  }
                                  actions={
                                      <IconButton onClick={() => router.push("/profile")}>
                                          <Icon
                                              source={require("@/assets/icons/person.xml")}
                                              size={24}
                                          />
                                      </IconButton>
                                  }
                              />
                          ),
                      }
                    : {
                          headerLargeTitle: true,
                          headerTransparent: true,
                          headerShadowVisible: false,
                          headerLargeStyle: { backgroundColor: "transparent" },
                          headerLeft: () => (
                              <Pressable
                                  onPress={() =>
                                      Alert.alert("Notifications", "You have no new notifications.")
                                  }
                                  hitSlop={10}
                                  style={({ pressed }) => ({
                                      width: 36,
                                      height: 36,
                                      borderRadius: 18,
                                      alignItems: "center",
                                      justifyContent: "center",
                                      opacity: pressed ? 0.7 : 1,
                                  })}
                              >
                                  <Feather
                                      name="bell"
                                      size={24}
                                      color={isDark ? "#ffffff" : "#111111"}
                                  />
                              </Pressable>
                          ),
                          headerRight: () => (
                              <Pressable
                                  onPress={() => router.push("/profile")}
                                  hitSlop={10}
                                  style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 18,
                                      alignItems: "center",
                                      justifyContent: "center",
                                  }}
                              >
                                  <IconSymbol
                                      size={24}
                                      name="person"
                                      color={isDark ? "#ffffff" : "#111111"}
                                  />
                              </Pressable>
                          ),
                      }),
            }}
        >
            <Stack.Screen name="index" options={{ title: "Dashboard" }} />
        </Stack>
    );
}
