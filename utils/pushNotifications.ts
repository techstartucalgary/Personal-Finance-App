import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "./supabase";

const PUSH_TOKEN_STORAGE_KEY = "notification_push_token";

export type NotificationNavigationPayload = {
  pathname?: string;
  params?: Record<string, string>;
  notificationId?: string;
};

export type PushTokenRow = {
  id: string;
  profile_id: string;
  expo_push_token: string;
  platform: string | null;
  device_name: string | null;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#111111",
    });
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error("Expo project ID not found for push registration.");
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function registerPushTokenForUser(params: {
  profile_id: string;
  expo_push_token: string;
}) {
  const { profile_id, expo_push_token } = params;

  const { data, error } = await supabase.rpc("register_notification_push_token", {
    target_profile_id: profile_id,
    target_expo_push_token: expo_push_token,
    target_platform: Platform.OS,
    target_device_name: Device.deviceName ?? null,
  });

  if (error) throw error;

  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expo_push_token);
  return data as PushTokenRow | null;
}

export async function deactivateStoredPushToken(params: {
  profile_id: string;
}) {
  const { profile_id } = params;
  const expoPushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

  if (!expoPushToken) return;

  const { error } = await supabase.rpc("deactivate_notification_push_token", {
    target_profile_id: profile_id,
    target_expo_push_token: expoPushToken,
  });

  if (error) throw error;
  await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
}

export function getNotificationNavigationPayload(
  notification: Notifications.Notification,
): NotificationNavigationPayload | null {
  const data = notification.request.content.data as
    | NotificationNavigationPayload
    | undefined;

  if (!data?.pathname) {
    return null;
  }

  return {
    pathname: data.pathname,
    params: normalizeParams(data.params),
    notificationId: data.notificationId,
  };
}

function normalizeParams(
  value: Record<string, unknown> | undefined,
): Record<string, string> {
  if (!value) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, rawValue]) => [key, String(rawValue)]),
  );
}
