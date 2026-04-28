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
  target_date_value date;
  total_days integer;
  elapsed_days integer;
  expected_progress numeric;
begin
  if tg_op = 'UPDATE' then
    old_bucket = public.goal_milestone_bucket(old.current_amount, old.target_amount);
  else
    old_bucket = null;
  end if;

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
    target_date_value = coalesce(new.target_date::date, current_date);
    total_days = greatest(target_date_value - created_date, 1);
    elapsed_days = greatest(least(current_date - created_date, total_days), 0);
    expected_progress = elapsed_days::numeric / total_days::numeric;

    if new.target_date is not null
      and current_date <= new.target_date::date
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
