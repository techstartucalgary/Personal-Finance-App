create extension if not exists pg_net;

create table if not exists public.notification_push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  platform text,
  device_name text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_push_tokens_profile_idx
  on public.notification_push_tokens (profile_id, is_active, updated_at desc);

create table if not exists public.notification_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  push_token_id uuid not null references public.notification_push_tokens (id) on delete cascade,
  expo_ticket_id text,
  status text not null default 'pending',
  error_code text,
  error_message text,
  response_body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (notification_id, push_token_id)
);

alter table public.notification_push_tokens enable row level security;
alter table public.notification_push_deliveries enable row level security;

drop policy if exists "notification_push_tokens_select_own" on public.notification_push_tokens;
create policy "notification_push_tokens_select_own"
  on public.notification_push_tokens
  for select
  using (auth.uid() = profile_id);

create or replace function public.set_notification_push_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_notification_push_tokens_updated_at on public.notification_push_tokens;
create trigger set_notification_push_tokens_updated_at
before update on public.notification_push_tokens
for each row
execute function public.set_notification_push_tokens_updated_at();

create or replace function public.set_notification_push_deliveries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_notification_push_deliveries_updated_at on public.notification_push_deliveries;
create trigger set_notification_push_deliveries_updated_at
before update on public.notification_push_deliveries
for each row
execute function public.set_notification_push_deliveries_updated_at();

create or replace function public.register_notification_push_token(
  target_profile_id uuid,
  target_expo_push_token text,
  target_platform text default null,
  target_device_name text default null
)
returns public.notification_push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  registered_row public.notification_push_tokens;
begin
  if auth.uid() is distinct from target_profile_id then
    raise exception 'Not allowed to register push token for another user';
  end if;

  insert into public.notification_push_tokens (
    profile_id,
    expo_push_token,
    platform,
    device_name,
    is_active,
    last_seen_at
  )
  values (
    target_profile_id,
    target_expo_push_token,
    target_platform,
    target_device_name,
    true,
    timezone('utc', now())
  )
  on conflict (expo_push_token) do update
  set
    profile_id = excluded.profile_id,
    platform = excluded.platform,
    device_name = excluded.device_name,
    is_active = true,
    last_seen_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning * into registered_row;

  return registered_row;
end;
$$;

grant execute on function public.register_notification_push_token(uuid, text, text, text) to authenticated;

create or replace function public.deactivate_notification_push_token(
  target_profile_id uuid,
  target_expo_push_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from target_profile_id then
    raise exception 'Not allowed to deactivate push token for another user';
  end if;

  update public.notification_push_tokens
  set
    is_active = false,
    updated_at = timezone('utc', now())
  where profile_id = target_profile_id
    and expo_push_token = target_expo_push_token;

  return true;
end;
$$;

grant execute on function public.deactivate_notification_push_token(uuid, text) to authenticated;

create or replace function public.queue_notification_push_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://terolwsnnpqxvvofyodo.supabase.co/functions/v1/send-notification-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcm9sd3NubnBxeHZ2b2Z5b2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNDUwOTMsImV4cCI6MjA3NjkyMTA5M30.lT61TWqPmc1IF9kSuIaBKvKVUXUKGUgIQvRcF4QglD4'
    ),
    body := jsonb_build_object(
      'notification_id', new.id,
      'profile_id', new.profile_id
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists queue_notification_push_dispatch on public.notifications;
create trigger queue_notification_push_dispatch
after insert on public.notifications
for each row
execute function public.queue_notification_push_dispatch();
