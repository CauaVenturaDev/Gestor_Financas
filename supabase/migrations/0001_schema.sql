-- =============================================================================
-- 0001_schema.sql — Tipos, tabelas e índices (seção 2 do planejamento)
-- Postgres 15+ (Supabase). gen_random_uuid() é nativo.
-- Dinheiro sempre em centavos (bigint). Datas sempre `date` puro (RN22, RN23).
-- =============================================================================

create extension if not exists pgcrypto;

do $$ begin
  create type kind_t as enum ('receita', 'despesa', 'aporte', 'resgate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nature_t as enum ('receita', 'despesa', 'investimento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_status_t as enum ('previsto', 'efetivado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rec_status_t as enum ('ativa', 'pausada', 'encerrada');
exception when duplicate_object then null; end $$;

-- "hoje" sempre no fuso do produto (RN23)
create or replace function public.today_brt() returns date
language sql stable
set search_path = public
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone     text not null default 'America/Sao_Paulo',
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nature      nature_t not null,
  name        text not null check (char_length(name) between 1 and 60),
  is_system   boolean not null default false,   -- "Sem categoria"
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index if not exists categories_name_uniq
  on public.categories (user_id, nature, lower(name)) where deleted_at is null;
create unique index if not exists categories_id_nature
  on public.categories (id, nature);                       -- alvo da FK composta
create index if not exists categories_user
  on public.categories (user_id) where deleted_at is null;
-- uma única categoria de sistema por natureza
create unique index if not exists categories_system_uniq
  on public.categories (user_id, nature) where is_system and deleted_at is null;

-- -----------------------------------------------------------------------------
-- recurrences
-- -----------------------------------------------------------------------------
create table if not exists public.recurrences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind            kind_t not null check (kind in ('receita', 'despesa')),
  name            text not null check (char_length(name) between 1 and 120),
  note            text,
  category_id     uuid,
  category_nature nature_t,
  amount_cents    bigint check (amount_cents is null or amount_cents > 0), -- null = variável
  day_of_month    smallint not null check (day_of_month between 1 and 31),
  start_date      date not null,
  end_date        date check (end_date >= start_date),
  status          rec_status_t not null default 'ativa',
  auto_confirm    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  foreign key (category_id, category_nature) references public.categories (id, nature),
  check ((category_id is null) = (category_nature is null)),
  check (category_id is null or category_nature::text = kind::text)
);
create index if not exists recurrences_user
  on public.recurrences (user_id) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind            kind_t not null,
  name            text not null check (char_length(name) between 1 and 120),
  note            text,
  date            date not null,
  amount_cents    bigint check (amount_cents is null or amount_cents > 0),
  status          tx_status_t not null default 'efetivado',
  category_id     uuid,
  category_nature nature_t,
  recurrence_id   uuid references public.recurrences (id),
  occurrence_ym   date,                            -- primeiro dia do mês da ocorrência
  is_detached     boolean not null default false,  -- ocorrência editada isoladamente
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  foreign key (category_id, category_nature) references public.categories (id, nature),
  check ((category_id is null) = (category_nature is null)),
  check (category_id is null or category_nature = (case kind
         when 'receita' then 'receita'
         when 'despesa' then 'despesa'
         else 'investimento' end)::nature_t),
  check (amount_cents is not null or status = 'previsto'), -- só previsto fica sem valor
  check ((recurrence_id is null) = (occurrence_ym is null))
);
-- Idempotência da recorrência (RN12). Sem filtro de deleted_at, de propósito:
-- ocorrência soft-deletada continua ocupando o mês e o motor não a recria.
create unique index if not exists tx_occurrence_uniq
  on public.transactions (recurrence_id, occurrence_ym)
  where recurrence_id is not null;
create index if not exists tx_user_date
  on public.transactions (user_id, date desc)   where deleted_at is null;
create index if not exists tx_user_kind_date
  on public.transactions (user_id, kind, date)  where deleted_at is null;
create index if not exists tx_user_category
  on public.transactions (user_id, category_id) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- banks / card_purchases / card_installments
-- -----------------------------------------------------------------------------
create table if not exists public.banks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index if not exists banks_name_uniq
  on public.banks (user_id, lower(name)) where deleted_at is null;

create table if not exists public.card_purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  bank_id            uuid not null references public.banks (id),
  purchase_date      date not null,
  description        text not null check (char_length(description) between 1 and 160),
  total_cents        bigint not null check (total_cents > 0),
  installments_count smallint not null check (installments_count between 1 and 48),
  first_due_date     date not null,     -- vencimento da parcela 1 (reconstituído, RN18)
  settled_at         date,              -- quitação antecipada (RN20)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists cp_user_bank
  on public.card_purchases (user_id, bank_id) where deleted_at is null;

create table if not exists public.card_installments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade, -- herdado da compra
  purchase_id  uuid not null references public.card_purchases (id) on delete cascade,
  number       smallint not null check (number >= 1),
  due_date     date not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_at      date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (purchase_id, number)
);
create index if not exists ci_user_due
  on public.card_installments (user_id, due_date) where deleted_at is null;
create index if not exists ci_user_open
  on public.card_installments (user_id, due_date)
  where paid_at is null and deleted_at is null;   -- projeção lê só este

-- -----------------------------------------------------------------------------
-- audit_log
-- -----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  table_name text not null,
  row_id     uuid not null,
  action     text not null check (action in ('insert', 'update', 'delete')),
  old_data   jsonb,
  new_data   jsonb,
  logged_at  timestamptz not null default now()
);
create index if not exists audit_user_time on public.audit_log (user_id, logged_at desc);
