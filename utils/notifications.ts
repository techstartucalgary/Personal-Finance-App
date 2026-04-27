import { supabase } from "./supabase";

export type NotificationRecord = {
  id: string;
  profile_id: string;
  preference_id: string | null;
  event_key: string;
  title: string;
  body: string;
  route_pathname: string | null;
  route_params: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreferenceRecord = {
  profile_id: string;
  preference_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export async function listNotifications(params: {
  profile_id: string;
  limit?: number;
}) {
  const { profile_id, limit = 50 } = params;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profile_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as NotificationRecord[];
}

export async function markNotificationRead(params: {
  id: string;
  profile_id: string;
  read?: boolean;
}) {
  const { id, profile_id, read = true } = params;

  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: read,
      read_at: read ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("profile_id", profile_id)
    .select("*")
    .single();

  if (error) throw error;
  return data as NotificationRecord;
}

export async function markAllNotificationsRead(params: { profile_id: string }) {
  const { profile_id } = params;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("profile_id", profile_id)
    .eq("is_read", false);

  if (error) throw error;
  return true;
}

export async function syncNotificationPreferences(params: {
  profile_id: string;
}) {
  const { profile_id } = params;

  const { data, error } = await supabase.rpc(
    "ensure_notification_preferences",
    {
      target_profile_id: profile_id,
    },
  );

  if (error) throw error;
  return (data ?? []) as NotificationPreferenceRecord[];
}

export async function updateNotificationPreference(params: {
  profile_id: string;
  preference_id: string;
  enabled: boolean;
}) {
  const { profile_id, preference_id, enabled } = params;

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        profile_id,
        preference_id,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,preference_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as NotificationPreferenceRecord;
}

export function subscribeToNotifications(params: {
  profile_id: string;
  onChange: () => void;
}) {
  const { profile_id, onChange } = params;

  const channel = supabase
    .channel(`notifications:${profile_id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `profile_id=eq.${profile_id}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToNotificationPreferences(params: {
  profile_id: string;
  onChange: () => void;
}) {
  const { profile_id, onChange } = params;

  const channel = supabase
    .channel(`notification-preferences:${profile_id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notification_preferences",
        filter: `profile_id=eq.${profile_id}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
