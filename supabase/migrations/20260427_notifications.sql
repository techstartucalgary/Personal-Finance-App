create extension if not exists pgcrypto;

create table if not exists public.notification_preferences (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  preference_id text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, preference_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  preference_id text,
  event_key text not null,
  title text not null,
  body text not null,
  route_pathname text,
  route_params jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, event_key)
);

create index if not exists notifications_profile_created_at_idx
  on public.notifications (profile_id, created_at desc);

create index if not exists notifications_profile_unread_idx
  on public.notifications (profile_id, is_read, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  using (auth.uid() = profile_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
  on public.notification_preferences
  for insert
  with check (auth.uid() = profile_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  using (auth.uid() = profile_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create or replace function public.set_notification_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.set_notification_preferences_updated_at();

create or replace function public.notification_preference_defaults()
returns table (preference_id text, default_enabled boolean)
language sql
stable
as $$
  values
    ('notifications.transactions.deposit_posted', true),
    ('notifications.transactions.large_expense', true),
    ('notifications.transactions.unusual_activity', true),
    ('notifications.transactions.needs_review', true),
    ('notifications.budget.exceeded', true),
    ('notifications.budget.near_limit', true),
    ('notifications.goals.milestone_reached', true),
    ('notifications.goals.off_track', true),
    ('notifications.goals.balance_checkin', false),
    ('notifications.other.credit_score_change', false),
    ('notifications.other.credit_utilization_high', false),
    ('notifications.other.referral_credits', false);
$$;

create or replace function public.ensure_notification_preferences(target_profile_id uuid)
returns setof public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (profile_id, preference_id, enabled)
  select
    target_profile_id,
    defaults.preference_id,
    defaults.default_enabled
  from public.notification_preference_defaults() as defaults
  on conflict (profile_id, preference_id) do nothing;

  return query
  select *
  from public.notification_preferences
  where profile_id = target_profile_id
  order by preference_id asc;
end;
$$;

grant execute on function public.ensure_notification_preferences(uuid) to authenticated;

create or replace function public.is_notification_enabled(
  target_profile_id uuid,
  target_preference_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  configured_enabled boolean;
  default_enabled boolean;
begin
  select np.enabled
  into configured_enabled
  from public.notification_preferences np
  where np.profile_id = target_profile_id
    and np.preference_id = target_preference_id;

  if configured_enabled is not null then
    return configured_enabled;
  end if;

  select defaults.default_enabled
  into default_enabled
  from public.notification_preference_defaults() as defaults
  where defaults.preference_id = target_preference_id;

  return coalesce(default_enabled, false);
end;
$$;

create or replace function public.create_notification(
  target_profile_id uuid,
  target_preference_id text,
  target_event_key text,
  target_title text,
  target_body text,
  target_route_pathname text default null,
  target_route_params jsonb default '{}'::jsonb,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if target_preference_id is not null
    and not public.is_notification_enabled(target_profile_id, target_preference_id) then
    return null;
  end if;

  insert into public.notifications (
    profile_id,
    preference_id,
    event_key,
    title,
    body,
    route_pathname,
    route_params,
    metadata
  )
  values (
    target_profile_id,
    target_preference_id,
    target_event_key,
    target_title,
    target_body,
    target_route_pathname,
    coalesce(target_route_params, '{}'::jsonb),
    coalesce(target_metadata, '{}'::jsonb)
  )
  on conflict (profile_id, event_key) do nothing
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.goal_milestone_bucket(
  current_amount numeric,
  target_amount numeric
)
returns integer
language plpgsql
immutable
as $$
declare
  progress_ratio numeric;
begin
  if target_amount is null or target_amount <= 0 then
    return null;
  end if;

  progress_ratio = coalesce(current_amount, 0) / target_amount;

  if progress_ratio >= 1 then
    return 100;
  elsif progress_ratio >= 0.75 then
    return 75;
  elsif progress_ratio >= 0.50 then
    return 50;
  elsif progress_ratio >= 0.25 then
    return 25;
  end if;

  return null;
end;
$$;

create or replace function public.handle_expense_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expense_date date;
  history_avg numeric;
  history_count integer;
  budget_link record;
  category_spend numeric;
begin
  expense_date = coalesce(new.transaction_date, new.created_at::date, current_date);

  if coalesce(new.amount, 0) >= 250 then
    perform public.create_notification(
      new.profile_id,
      'notifications.transactions.large_expense',
      format('expense:%s:large-expense', new.id),
      'Large expense detected',
      format(
        'A transaction of $%s was recorded%s.',
        to_char(coalesce(new.amount, 0), 'FM999999990.00'),
        case
          when nullif(trim(coalesce(new.description, '')), '') is not null
            then format(' for %s', trim(new.description))
          else ''
        end
      ),
      '/transaction/[id]',
      jsonb_build_object('id', new.id::text),
      jsonb_build_object('expense_id', new.id)
    );
  end if;

  if nullif(trim(coalesce(new.description, '')), '') is null
    or new.expense_categoryid is null then
    perform public.create_notification(
      new.profile_id,
      'notifications.transactions.needs_review',
      format('expense:%s:needs-review', new.id),
      'Transaction needs review',
      'A transaction is missing details and may need a category or description.',
      '/transaction/[id]',
      jsonb_build_object('id', new.id::text),
      jsonb_build_object('expense_id', new.id)
    );
  end if;

  select avg(e.amount), count(*)
  into history_avg, history_count
  from public."Expense" e
  where e.profile_id = new.profile_id
    and e.id <> new.id
    and e.account_id is not distinct from new.account_id
    and e.expense_categoryid is not distinct from new.expense_categoryid
    and coalesce(e.transaction_date, e.created_at::date)
      >= (expense_date - interval '30 days')::date;

  if history_count >= 3
    and coalesce(new.amount, 0) >= greatest(coalesce(history_avg, 0) * 2, 100) then
    perform public.create_notification(
      new.profile_id,
      'notifications.transactions.unusual_activity',
      format('expense:%s:unusual-activity', new.id),
      'Unusual spending activity',
      'This transaction is significantly higher than your recent spending pattern.',
      '/transaction/[id]',
      jsonb_build_object('id', new.id::text),
      jsonb_build_object('expense_id', new.id)
    );
  end if;

  if new.expense_categoryid is not null then
    for budget_link in
      select
        b.id as budget_id,
        b.budget_name,
        b.start_date,
        b.end_date,
        cb.id as category_budget_id,
        cb.limit_amount
      from public."Budget" b
      join public."Expense_category_budget" cb
        on cb.budget_id = b.id
      where b.profile_id = new.profile_id
        and cb.expense_category_id = new.expense_categoryid
        and expense_date between b.start_date and b.end_date
    loop
      select coalesce(sum(e.amount), 0)
      into category_spend
      from public."Expense" e
      where e.profile_id = new.profile_id
        and e.expense_categoryid = new.expense_categoryid
        and coalesce(e.transaction_date, e.created_at::date)
          between budget_link.start_date and budget_link.end_date;

      if category_spend >= budget_link.limit_amount then
        perform public.create_notification(
          new.profile_id,
          'notifications.budget.exceeded',
          format(
            'budget:%s:category-budget:%s:exceeded',
            budget_link.budget_id,
            budget_link.category_budget_id
          ),
          'Budget exceeded',
          format(
            '%s is over budget at $%s spent against a $%s limit.',
            coalesce(budget_link.budget_name, 'A budget'),
            to_char(category_spend, 'FM999999990.00'),
            to_char(budget_link.limit_amount, 'FM999999990.00')
          ),
          '/targets',
          '{}'::jsonb,
          jsonb_build_object(
            'budget_id', budget_link.budget_id,
            'category_budget_id', budget_link.category_budget_id
          )
        );
      elsif budget_link.limit_amount > 0
        and category_spend >= budget_link.limit_amount * 0.8 then
        perform public.create_notification(
          new.profile_id,
          'notifications.budget.near_limit',
          format(
            'budget:%s:category-budget:%s:near-limit',
            budget_link.budget_id,
            budget_link.category_budget_id
          ),
          'Budget nearing limit',
          format(
            '%s has reached $%s of its $%s category limit.',
            coalesce(budget_link.budget_name, 'A budget'),
            to_char(category_spend, 'FM999999990.00'),
            to_char(budget_link.limit_amount, 'FM999999990.00')
          ),
          '/targets',
          '{}'::jsonb,
          jsonb_build_object(
            'budget_id', budget_link.budget_id,
            'category_budget_id', budget_link.category_budget_id
          )
        );
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists handle_expense_notifications on public."Expense";
create trigger handle_expense_notifications
after insert or update of amount, description, expense_categoryid, account_id, transaction_date
on public."Expense"
for each row
execute function public.handle_expense_notifications();

create or replace function public.handle_goal_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_bucket integer;
  new_bucket integer;
  progress_ratio numeric;
  created_date date;
  total_days integer;
  elapsed_days integer;
  expected_progress numeric;
begin
  old_bucket = public.goal_milestone_bucket(old.current_amount, old.target_amount);
  new_bucket = public.goal_milestone_bucket(new.current_amount, new.target_amount);

  if new_bucket is not null
    and coalesce(old_bucket, 0) < new_bucket then
    perform public.create_notification(
      new.profile_id,
      'notifications.goals.milestone_reached',
      format('goal:%s:milestone:%s', new.id, new_bucket),
      'Goal milestone reached',
      format('%s reached %s%% of its target.', new.name, new_bucket),
      '/targets',
      '{}'::jsonb,
      jsonb_build_object('goal_id', new.id, 'milestone', new_bucket)
    );
  end if;

  if new.target_amount is not null and new.target_amount > 0 then
    progress_ratio = coalesce(new.current_amount, 0) / new.target_amount;
    created_date = coalesce(new.created_at::date, current_date);
    total_days = greatest(coalesce(new.target_date, current_date) - created_date, 1);
    elapsed_days = greatest(least(current_date - created_date, total_days), 0);
    expected_progress = elapsed_days::numeric / total_days::numeric;

    if new.target_date is not null
      and current_date <= new.target_date
      and progress_ratio < 1
      and progress_ratio + 0.15 < expected_progress then
      perform public.create_notification(
        new.profile_id,
        'notifications.goals.off_track',
        format('goal:%s:off-track:%s', new.id, new.target_date),
        'Goal may be off track',
        format('%s is behind the pace needed to hit its target date.', new.name),
        '/targets',
        '{}'::jsonb,
        jsonb_build_object('goal_id', new.id)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists handle_goal_notifications on public."Goal";
create trigger handle_goal_notifications
after insert or update of current_amount, target_amount, target_date
on public."Goal"
for each row
execute function public.handle_goal_notifications();

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notification_preferences'
    ) then
      alter publication supabase_realtime add table public.notification_preferences;
    end if;
  end if;
end;
$$;
