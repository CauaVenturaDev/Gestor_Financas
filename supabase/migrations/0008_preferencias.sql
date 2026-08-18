-- =============================================================================
-- 0008_preferencias.sql — Preferências de aviso no perfil
-- Viram o padrão de cada compromisso novo quando a Agenda entrar (plano G2).
-- O tema não mora aqui: ele fica num cookie, para a página já renderizar com a
-- cor certa no servidor, sem piscar branco antes de trocar.
-- =============================================================================

alter table public.profiles
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_time time not null default '09:00',
  add column if not exists notify_days_before smallint not null default 1;

do $$
begin
  alter table public.profiles
    add constraint profiles_notify_days_before_check
    check (notify_days_before between 0 and 30);
exception when duplicate_object then null; end $$;
