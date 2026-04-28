create or replace function public.goal_milestone_bucket(
  current_amount double precision,
  target_amount double precision
)
returns integer
language plpgsql
immutable
as $$
begin
  return public.goal_milestone_bucket(
    current_amount::numeric,
    target_amount::numeric
  );
end;
$$;
