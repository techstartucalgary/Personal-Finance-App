import React, { PropsWithChildren, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { useAuthContext } from "@/hooks/use-auth-context";
import { markNotificationRead } from "@/utils/notifications";
import {
  deactivateStoredPushToken,
  getNotificationNavigationPayload,
  registerForPushNotificationsAsync,
  registerPushTokenForUser,
} from "@/utils/pushNotifications";

export default function NotificationsProvider({
  children,
}: PropsWithChildren) {
  const { session, isLoading } = useAuthContext();
  const router = useRouter();
  const hasHandledInitialResponse = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    const profileId = session?.user.id;
    if (!profileId) return;

    let isCancelled = false;

    const syncPushToken = async () => {
      try {
        const expoPushToken = await registerForPushNotificationsAsync();

        if (!expoPushToken || isCancelled) return;

        await registerPushTokenForUser({
          profile_id: profileId,
          expo_push_token: expoPushToken,
        });
      } catch (error) {
        console.error("Error registering push notifications:", error);
      }
    };

    void syncPushToken();

    return () => {
      isCancelled = true;
    };
  }, [isLoading, session?.user.id]);

  useEffect(() => {
    const redirectFromNotification = async (
      notification: Notifications.Notification,
    ) => {
      const payload = getNotificationNavigationPayload(notification);
      if (!payload?.pathname) return;

      if (session?.user.id && payload.notificationId) {
        try {
          await markNotificationRead({
            id: payload.notificationId,
            profile_id: session.user.id,
          });
        } catch (error) {
          console.error("Error marking pushed notification as read:", error);
        }
      }

      router.push({
        pathname: payload.pathname as never,
        params: (payload.params ?? {}) as never,
      });
    };

    if (!hasHandledInitialResponse.current) {
      hasHandledInitialResponse.current = true;
      const initialResponse = Notifications.getLastNotificationResponse();
      if (initialResponse?.notification) {
        void redirectFromNotification(initialResponse.notification);
      }
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void redirectFromNotification(response.notification);
      });

    return () => {
      subscription.remove();
    };
  }, [router, session?.user.id]);

  return <>{children}</>;
}
