import { createClient } from "npm:@supabase/supabase-js@2";

type DispatchPayload = {
  notification_id?: string;
  profile_id?: string;
};

type NotificationRow = {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  route_pathname: string | null;
  route_params: Record<string, string> | null;
};

type PushTokenRow = {
  id: string;
  expo_push_token: string;
};

type PushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables for push dispatch.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = (await request.json()) as DispatchPayload;
    const notificationId = payload.notification_id;

    if (!notificationId) {
      return jsonResponse({ error: "notification_id is required" }, 400);
    }

    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .select("id, profile_id, title, body, route_pathname, route_params")
      .eq("id", notificationId)
      .single();

    if (notificationError || !notification) {
      return jsonResponse(
        {
          error: "Notification not found",
          details: notificationError?.message ?? null,
        },
        404,
      );
    }

    const typedNotification = notification as NotificationRow;

    const { data: tokens, error: tokensError } = await supabase
      .from("notification_push_tokens")
      .select("id, expo_push_token")
      .eq("profile_id", typedNotification.profile_id)
      .eq("is_active", true);

    if (tokensError) {
      throw tokensError;
    }

    const activeTokens = (tokens ?? []) as PushTokenRow[];
    if (activeTokens.length === 0) {
      return jsonResponse({ delivered: 0, skipped: "no_active_tokens" });
    }

    const { data: existingDeliveries, error: deliveriesError } = await supabase
      .from("notification_push_deliveries")
      .select("push_token_id")
      .eq("notification_id", typedNotification.id);

    if (deliveriesError) {
      throw deliveriesError;
    }

    const existingTokenIds = new Set(
      (existingDeliveries ?? []).map((row) => String(row.push_token_id)),
    );

    const unsentTokens = activeTokens.filter(
      (token) => !existingTokenIds.has(token.id),
    );

    if (unsentTokens.length === 0) {
      return jsonResponse({ delivered: 0, skipped: "already_dispatched" });
    }

    const messages = unsentTokens.map((token) => ({
      to: token.expo_push_token,
      sound: "default",
      channelId: "default",
      title: typedNotification.title,
      body: typedNotification.body,
      data: {
        notificationId: typedNotification.id,
        pathname: typedNotification.route_pathname ?? undefined,
        params: typedNotification.route_params ?? {},
      },
    }));

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const expoResponseBody = await expoResponse.json();

    if (!expoResponse.ok) {
      throw new Error(
        `Expo push API failed with ${expoResponse.status}: ${JSON.stringify(expoResponseBody)}`,
      );
    }

    const tickets = Array.isArray(expoResponseBody.data)
      ? (expoResponseBody.data as PushTicket[])
      : [expoResponseBody.data as PushTicket];

    for (let index = 0; index < unsentTokens.length; index += 1) {
      const token = unsentTokens[index];
      const ticket = tickets[index];

      const deliveryPayload = {
        notification_id: typedNotification.id,
        push_token_id: token.id,
        expo_ticket_id: ticket?.id ?? null,
        status: ticket?.status ?? "error",
        error_code: ticket?.details?.error ?? null,
        error_message: ticket?.message ?? null,
        response_body: ticket ?? {},
      };

      const { error: insertDeliveryError } = await supabase
        .from("notification_push_deliveries")
        .insert(deliveryPayload);

      if (insertDeliveryError) {
        throw insertDeliveryError;
      }

      if (ticket?.details?.error === "DeviceNotRegistered") {
        const { error: deactivateError } = await supabase
          .from("notification_push_tokens")
          .update({ is_active: false })
          .eq("id", token.id);

        if (deactivateError) {
          console.error("Failed to deactivate invalid push token", deactivateError);
        }
      }
    }

    return jsonResponse({
      delivered: unsentTokens.length,
      tickets: tickets.length,
    });
  } catch (error) {
    console.error("Push dispatch failed:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
