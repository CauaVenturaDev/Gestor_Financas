-- =============================================================================
-- 0002_triggers_views.sql — Funções de apoio, triggers, views e seed do usuário
-- =============================================================================

-- updated_at automático ---------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.updated_at := now();
  return new;
end $fn$;

drop trigger if exists set_updated_at on public.recurrences;
create trigger set_updated_at before update on public.recurrences
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.transactions;
create trigger set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.card_purchases;
create trigger set_updated_at before update on public.card_purchases
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.card_installments;
create trigger set_updated_at before update on public.card_installments
  for each row execute function public.set_updated_at();

-- parcela herda o dono da compra (mantém a desnormalização da RLS consistente) ---
create or replace function public.ci_inherit_user() returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  select user_id into new.user_id from public.card_purchases where id = new.purchase_id;
  return new;
end $fn$;

drop trigger if exists ci_user on public.card_installments;
create trigger ci_user before insert on public.card_installments
  for each row execute function public.ci_inherit_user();

-- auditoria genérica (RN24) -----------------------------------------------------
-- security definer para gravar sem policy de insert no audit_log
create or replace function public.audit_row() returns trigger
security definer set search_path = public
language plpgsql as $fn$
begin
  insert into public.audit_log (user_id, table_name, row_id, action, old_data, new_data)
  values (coalesce(new.user_id, old.user_id), tg_table_name,
          coalesce(new.id, old.id), lower(tg_op), to_jsonb(old), to_jsonb(new));
  return coalesce(new, old);
end $fn$;

do $$
declare t text;
begin
  foreach t in array array['categories','recurrences','transactions',
                           'banks','card_purchases','card_installments']
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- seed no cadastro: perfil + "Sem categoria" + categorias padrão ----------------
create or replace function public.handle_new_user() returns trigger
security definer set search_path = public
language plpgsql as $fn$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;

  insert into public.categories (user_id, nature, name, is_system) values
    (new.id, 'receita',       'Sem categoria', true),
    (new.id, 'despesa',       'Sem categoria', true),
    (new.id, 'investimento',  'Sem categoria', true)
  on conflict do nothing;

  insert into public.categories (user_id, nature, name)
  select new.id, t.n::nature_t, t.c from (values
    ('receita', 'Salário'), ('receita', 'Freelance'), ('receita', 'Vendas'), ('receita', 'Outros'),
    ('despesa', 'Moradia'), ('despesa', 'Alimentação'), ('despesa', 'Transporte'),
    ('despesa', 'Saúde'), ('despesa', 'Lazer'), ('despesa', 'Educação'),
    ('despesa', 'Assinaturas'), ('despesa', 'Outros'),
    ('investimento', 'Renda fixa'), ('investimento', 'Renda variável'),
    ('investimento', 'Reserva de emergência'), ('investimento', 'Outros')
  ) as t(n, c)
  on conflict do nothing;

  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- views com status derivado por data, sem job (RN17) -----------------------------
drop view if exists public.v_card_purchases;
drop view if exists public.v_card_installments;

create view public.v_card_installments with (security_invoker = on) as
select i.*,
  case
    when i.paid_at is not null            then 'paga'
    when i.due_date < public.today_brt()  then 'atrasada'
    else 'em_aberto'
  end as status
from public.card_installments i
where i.deleted_at is null;

create view public.v_card_purchases with (security_invoker = on) as
select p.*,
  s.paid_count,
  s.overdue_count,
  least(s.paid_count + 1, p.installments_count::bigint) as current_number, -- parcela atual
  p.total_cents - s.paid_cents as open_cents,
  case
    when s.paid_count = p.installments_count then 'quitada'
    when s.overdue_count > 0                 then 'atrasada'
    else 'em_andamento'
  end as status
from public.card_purchases p
cross join lateral (
  select count(*) filter (where i.paid_at is not null)                                  as paid_count,
         count(*) filter (where i.paid_at is null and i.due_date < public.today_brt())  as overdue_count,
         coalesce(sum(i.amount_cents) filter (where i.paid_at is not null), 0)          as paid_cents
  from public.card_installments i
  where i.purchase_id = p.id and i.deleted_at is null
) s
where p.deleted_at is null;
