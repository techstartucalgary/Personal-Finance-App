-- =============================================================================
-- Hybrid Retrieval: Embeddings Setup
-- =============================================================================
-- Paste this entire file into the Supabase SQL editor and Run.
-- Idempotent: safe to re-run.
--
-- What this creates:
--   1. pgvector + pg_net extensions
--   2. embedding_queue (generic, shared across all embeddable tables)
--   3. embedding columns + HNSW indexes on Expense and Income
--   4. notify_embedding_worker() — fires pg_net.http_post to the edge function
--   5. trigger functions + triggers for Expense and Income
--   6. match_expenses() and match_incomes() RPCs
--   7. backfill_embeddings() helper
--
-- Type assumptions (adjust if your schema differs):
--   - Expense.id, Income.id, account_id, *_categoryid: bigint (int8)
--   - profile_id: uuid
--   - amount: float8
--
-- Required Vault secrets (Project Settings → Vault):
--   - embeddings_edge_url:  https://<project-ref>.functions.supabase.co/process-embeddings
--   - service_role_key:     <your service role key>
-- Until both exist, triggers log a warning and skip the worker call.
-- Inserts still succeed; rows still queue. Just nothing processes them.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists vector;
create extension if not exists pg_net;


-- -----------------------------------------------------------------------------
-- 2. Generic embedding queue (shared across all embeddable tables)
-- -----------------------------------------------------------------------------
create table if not exists public.embedding_queue (
  id            bigserial primary key,
  source_table  text        not null,
  source_id     bigint      not null,
  source_text   text        not null,
  status        text        not null default 'pending',  -- pending|processing|done|failed
  attempts      int         not null default 0,
  last_error    text,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz
);

create index if not exists embedding_queue_status_idx
  on public.embedding_queue (status, created_at);

create index if not exists embedding_queue_source_idx
  on public.embedding_queue (source_table, source_id);


-- -----------------------------------------------------------------------------
-- 3. Embedding columns + HNSW indexes
-- -----------------------------------------------------------------------------
-- HNSW with cosine distance: order by `embedding <=> query` ascending = closest first.
-- Similarity in [-1, 1] = 1 - cosine_distance, higher = more similar.

alter table public."Expense"
  add column if not exists embedding             vector(1536),
  add column if not exists embedding_updated_at  timestamptz;

create index if not exists expense_embedding_hnsw_idx
  on public."Expense" using hnsw (embedding vector_cosine_ops);

alter table public."Income"
  add column if not exists embedding             vector(1536),
  add column if not exists embedding_updated_at  timestamptz;

create index if not exists income_embedding_hnsw_idx
  on public."Income" using hnsw (embedding vector_cosine_ops);

-- >>> ADD NEW TABLE HERE <<<
-- Template for future tables (e.g. Goals, Plaid transactions):
--   alter table public."<TableName>"
--     add column if not exists embedding             vector(1536),
--     add column if not exists embedding_updated_at  timestamptz;
--   create index if not exists <table>_embedding_hnsw_idx
--     on public."<TableName>" using hnsw (embedding vector_cosine_ops);


-- -----------------------------------------------------------------------------
-- 4. Worker notification helper
-- -----------------------------------------------------------------------------
-- Reads vault secrets and fires a fire-and-forget pg_net.http_post.
-- Gracefully no-ops with a warning if secrets are missing — so triggers
-- never fail the parent transaction.
create or replace function public.notify_embedding_worker(queue_id bigint)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'embeddings_edge_url';
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if v_url is null or v_key is null then
    raise warning '[embeddings] vault secrets missing; queue_id=% will remain pending', queue_id;
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('queue_id', queue_id),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. Trigger functions + triggers
-- -----------------------------------------------------------------------------

-- Expense ---------------------------------------------------------------------
create or replace function public.enqueue_expense_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue_id bigint;
begin
  -- UPDATE: skip if description didn't actually change
  if TG_OP = 'UPDATE' and NEW.description is not distinct from OLD.description then
    return NEW;
  end if;

  -- Skip null/empty descriptions
  if NEW.description is null or length(trim(NEW.description)) = 0 then
    return NEW;
  end if;

  insert into public.embedding_queue (source_table, source_id, source_text)
  values ('Expense', NEW.id, NEW.description)
  returning id into v_queue_id;

  perform public.notify_embedding_worker(v_queue_id);
  return NEW;
end;
$$;

drop trigger if exists trg_enqueue_expense_embedding on public."Expense";
create trigger trg_enqueue_expense_embedding
  after insert or update of description on public."Expense"
  for each row execute function public.enqueue_expense_embedding();


-- Income ----------------------------------------------------------------------
create or replace function public.enqueue_income_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue_id bigint;
begin
  if TG_OP = 'UPDATE' and NEW.source_description is not distinct from OLD.source_description then
    return NEW;
  end if;

  if NEW.source_description is null or length(trim(NEW.source_description)) = 0 then
    return NEW;
  end if;

  insert into public.embedding_queue (source_table, source_id, source_text)
  values ('Income', NEW.id, NEW.source_description)
  returning id into v_queue_id;

  perform public.notify_embedding_worker(v_queue_id);
  return NEW;
end;
$$;

drop trigger if exists trg_enqueue_income_embedding on public."Income";
create trigger trg_enqueue_income_embedding
  after insert or update of source_description on public."Income"
  for each row execute function public.enqueue_income_embedding();


-- >>> ADD NEW TABLE HERE <<<
-- Template for future tables. Replace <Table>, <text_col> accordingly.
-- For composite text (e.g. Plaid: merchant_name + name + original_description),
-- build NEW.<text_col> from coalesce(NEW.col_a, '') || ' ' || coalesce(...).
--
--   create or replace function public.enqueue_<table>_embedding()
--   returns trigger language plpgsql security definer set search_path = public as $$
--   declare v_queue_id bigint;
--   begin
--     if TG_OP = 'UPDATE' and NEW.<text_col> is not distinct from OLD.<text_col> then return NEW; end if;
--     if NEW.<text_col> is null or length(trim(NEW.<text_col>)) = 0 then return NEW; end if;
--     insert into public.embedding_queue (source_table, source_id, source_text)
--     values ('<Table>', NEW.id, NEW.<text_col>)
--     returning id into v_queue_id;
--     perform public.notify_embedding_worker(v_queue_id);
--     return NEW;
--   end; $$;
--
--   drop trigger if exists trg_enqueue_<table>_embedding on public."<Table>";
--   create trigger trg_enqueue_<table>_embedding
--     after insert or update of <text_col> on public."<Table>"
--     for each row execute function public.enqueue_<table>_embedding();


-- -----------------------------------------------------------------------------
-- 6. Match RPCs (semantic search)
-- -----------------------------------------------------------------------------
-- Returned `similarity` is cosine similarity in [-1, 1]; higher = more similar.
-- Match threshold defaults to 0.3 — tune per use case.

create or replace function public.match_expenses(
  query_embedding vector(1536),
  p_profile_id    uuid,
  match_threshold float default 0.3,
  match_count     int   default 10
)
returns table (
  id                 bigint,
  account_id         bigint,
  amount             float8,
  description        varchar,
  expense_categoryid bigint,
  transaction_date   timestamptz,
  similarity         float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.account_id,
    e.amount,
    e.description,
    e.expense_categoryid,
    e.transaction_date,
    (1 - (e.embedding <=> query_embedding))::float as similarity
  from public."Expense" e
  where e.profile_id = p_profile_id
    and e.embedding is not null
    and (1 - (e.embedding <=> query_embedding)) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_incomes(
  query_embedding vector(1536),
  p_profile_id    uuid,
  match_threshold float default 0.3,
  match_count     int   default 10
)
returns table (
  id                 bigint,
  account_id         bigint,
  amount             float8,
  source_description varchar,
  income_categoryid  bigint,
  created_at         timestamptz,
  similarity         float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.account_id,
    i.amount,
    i.source_description,
    i.income_categoryid,
    i.created_at,
    (1 - (i.embedding <=> query_embedding))::float as similarity
  from public."Income" i
  where i.profile_id = p_profile_id
    and i.embedding is not null
    and (1 - (i.embedding <=> query_embedding)) > match_threshold
  order by i.embedding <=> query_embedding
  limit match_count;
$$;

-- >>> ADD NEW TABLE HERE <<<
-- Template:
--   create or replace function public.match_<table>(
--     query_embedding vector(1536),
--     p_profile_id    uuid,
--     match_threshold float default 0.3,
--     match_count     int   default 10
--   ) returns table (id bigint, ...other_cols..., similarity float)
--   language sql stable security definer set search_path = public as $$
--     select <cols>, (1 - (t.embedding <=> query_embedding))::float as similarity
--     from public."<Table>" t
--     where t.profile_id = p_profile_id and t.embedding is not null
--       and (1 - (t.embedding <=> query_embedding)) > match_threshold
--     order by t.embedding <=> query_embedding limit match_count;
--   $$;


-- -----------------------------------------------------------------------------
-- 7. Backfill helper
-- -----------------------------------------------------------------------------
-- Enqueues every row missing an embedding, then fires worker notifications.
-- Run once after the edge function is live and vault secrets are set:
--   select * from public.backfill_embeddings();
create or replace function public.backfill_embeddings()
returns table (table_name text, queued bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_count bigint := 0;
  v_income_count  bigint := 0;
  r_queue         record;
begin
  with enqueued as (
    insert into public.embedding_queue (source_table, source_id, source_text)
    select 'Expense', e.id, e.description
    from public."Expense" e
    where e.embedding is null
      and e.description is not null
      and length(trim(e.description)) > 0
    returning id
  )
  select count(*) into v_expense_count from enqueued;

  with enqueued as (
    insert into public.embedding_queue (source_table, source_id, source_text)
    select 'Income', i.id, i.source_description
    from public."Income" i
    where i.embedding is null
      and i.source_description is not null
      and length(trim(i.source_description)) > 0
    returning id
  )
  select count(*) into v_income_count from enqueued;

  -- >>> ADD NEW TABLE HERE <<<
  -- Add another `with enqueued as (...) select count(*) into v_<table>_count from enqueued;`
  -- block above for each new embeddable table.

  -- Fire workers for everything still pending with attempts=0
  for r_queue in
    select id from public.embedding_queue
    where status = 'pending' and attempts = 0
  loop
    perform public.notify_embedding_worker(r_queue.id);
  end loop;

  return query
    select 'Expense'::text, v_expense_count
    union all
    select 'Income'::text, v_income_count;
end;
$$;


-- -----------------------------------------------------------------------------
-- 8. Permissions
-- -----------------------------------------------------------------------------
-- Lock everything down to service role; users hit these via the chat API.

-- RLS on embedding_queue: no policies = no anon/authenticated access.
-- Service role bypasses RLS, so the edge function still operates normally.
alter table public.embedding_queue enable row level security;

revoke all on public.embedding_queue from anon, authenticated;

revoke all on function public.notify_embedding_worker(bigint) from anon, authenticated;
revoke all on function public.enqueue_expense_embedding() from anon, authenticated;
revoke all on function public.enqueue_income_embedding() from anon, authenticated;
revoke all on function public.backfill_embeddings() from anon, authenticated;

revoke all on function public.match_expenses(vector(1536), uuid, float, int) from anon, authenticated;
revoke all on function public.match_incomes(vector(1536), uuid, float, int) from anon, authenticated;
