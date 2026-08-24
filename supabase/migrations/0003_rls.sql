-- =============================================================================
-- 0003_rls.sql — Isolamento por usuário (seção 3 do planejamento)
-- Uma policy por operação, todas com a mesma condição.
-- O `with check` impede gravar linha em nome de outro usuário, mesmo com payload forjado.
-- =============================================================================

alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.recurrences       enable row level security;
alter table public.transactions      enable row level security;
alter table public.banks             enable row level security;
alter table public.card_purchases    enable row level security;
alter table public.card_installments enable row level security;
alter table public.audit_log         enable row level security;

-- padrão aplicado a todas as tabelas de negócio
do $$
declare t text;
begin
  foreach t in array array['categories','recurrences','transactions',
                           'banks','card_purchases','card_installments']
  loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);

    execute format(
      'create policy %1$s_select on public.%1$s for select
         to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy %1$s_insert on public.%1$s for insert
         to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy %1$s_update on public.%1$s for update
         to authenticated using (user_id = (select auth.uid()))
                        with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy %1$s_delete on public.%1$s for delete
         to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- profiles: só a própria linha, sem delete direto (a conta some via deleteAccount)
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select
  to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update
  to authenticated using (id = (select auth.uid()))
                 with check (id = (select auth.uid()));

-- audit_log: nenhuma policy para authenticated. A gravação passa pela função
-- security definer; a leitura fica restrita à service role.

-- as views herdam a RLS das tabelas (security_invoker = on)
grant select on public.v_card_installments to authenticated;
grant select on public.v_card_purchases    to authenticated;
