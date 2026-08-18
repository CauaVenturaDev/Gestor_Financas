-- =============================================================================
-- 0004_engines.sql — Motores de recorrência e parcelamento (seção 5)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Motor de recorrência (RN11, RN12)
-- Gera as ocorrências de um mês para um usuário. Reexecutável por construção:
-- o índice único (recurrence_id, occurrence_ym) + on conflict do nothing garantem
-- que rodar dez vezes dá o mesmo resultado de rodar uma.
-- -----------------------------------------------------------------------------
create or replace function public.generate_occurrences(p_user uuid, p_ym date)
returns integer
security definer set search_path = public
language plpgsql as $fn$
declare
  v_ym    date := date_trunc('month', p_ym)::date;
  v_fim   date := (v_ym + interval '1 month' - interval '1 day')::date;
  v_hoje  date := public.today_brt();
  v_count integer;
begin
  with cand as (
    select r.*,
           (v_ym + (least(r.day_of_month, extract(day from v_fim)::int) - 1) * interval '1 day')::date as venc
    from public.recurrences r
    where r.user_id = p_user
      and r.deleted_at is null
      and r.status = 'ativa'
      and r.start_date <= v_fim
      and (r.end_date is null or r.end_date >= v_ym)
  )
  insert into public.transactions
    (user_id, kind, name, note, category_id, category_nature,
     amount_cents, date, status, recurrence_id, occurrence_ym)
  select c.user_id, c.kind, c.name, c.note, c.category_id, c.category_nature,
         c.amount_cents, c.venc,
         case when c.amount_cents is not null and c.venc <= v_hoje and c.auto_confirm
              then 'efetivado'::tx_status_t
              else 'previsto'::tx_status_t end,
         c.id, v_ym
  from cand c
  where c.venc >= c.start_date
    and (c.end_date is null or c.venc <= c.end_date)
  on conflict (recurrence_id, occurrence_ym) where recurrence_id is not null
  do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end $fn$;

-- Efetivação automática (RN10) para um usuário.
create or replace function public.effectuate_due(p_user uuid)
returns integer
security definer set search_path = public
language plpgsql as $fn$
declare v_count integer;
begin
  update public.transactions t
     set status = 'efetivado'
   where t.user_id = p_user
     and t.deleted_at is null
     and t.status = 'previsto'
     and t.amount_cents is not null
     and t.date <= public.today_brt()
     and (t.recurrence_id is null
          or exists (select 1 from public.recurrences r
                      where r.id = t.recurrence_id and r.auto_confirm));
  get diagnostics v_count = row_count;
  return v_count;
end $fn$;

-- Chamada pela aplicação ao abrir um mês. Garante as ocorrências de p_start_ym
-- até p_end_ym (teto de 12 meses) e efetiva o que venceu.
create or replace function public.ensure_occurrences(p_start_ym date, p_end_ym date)
returns integer
security invoker set search_path = public
language plpgsql as $fn$
declare
  v_user  uuid := (select auth.uid());
  v_from  date := date_trunc('month', p_start_ym)::date;
  v_to    date := date_trunc('month', p_end_ym)::date;
  v_m     date;
  v_total integer := 0;
begin
  if v_user is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;
  -- teto de 12 meses à frente do mês corrente
  v_to := least(v_to, (date_trunc('month', public.today_brt()) + interval '12 months')::date);
  if v_to < v_from then
    v_to := v_from;
  end if;

  v_m := v_from;
  while v_m <= v_to loop
    v_total := v_total + public.generate_occurrences(v_user, v_m);
    v_m := (v_m + interval '1 month')::date;
  end loop;

  perform public.effectuate_due(v_user);
  return v_total;
end $fn$;

-- Job diário (cron, 03:10 BRT). Percorre todos os usuários.
create or replace function public.process_daily()
returns jsonb
security definer set search_path = public
language plpgsql as $fn$
declare
  v_hoje    date := public.today_brt();
  v_m0      date := date_trunc('month', v_hoje)::date;
  v_m1      date := (v_m0 + interval '1 month')::date;
  v_closed  integer := 0;
  v_gen     integer := 0;
  v_eff     integer := 0;
  v_purged  integer := 0;
  r         record;
begin
  -- encerra regras cujo fim já passou
  update public.recurrences
     set status = 'encerrada'
   where deleted_at is null and status = 'ativa'
     and end_date is not null and end_date < v_hoje;
  get diagnostics v_closed = row_count;

  for r in select id from public.profiles loop
    v_gen := v_gen + public.generate_occurrences(r.id, v_m0);
    v_gen := v_gen + public.generate_occurrences(r.id, v_m1);
    v_eff := v_eff + public.effectuate_due(r.id);
  end loop;

  -- expurgo da auditoria: retenção de 12 meses (premissa 15)
  delete from public.audit_log where logged_at < now() - interval '12 months';
  get diagnostics v_purged = row_count;

  return jsonb_build_object('date', v_hoje, 'closed', v_closed,
                            'generated', v_gen, 'effectuated', v_eff,
                            'audit_purged', v_purged);
end $fn$;

-- -----------------------------------------------------------------------------
-- Operações sobre a regra de recorrência (seção 5.1, RN13)
-- Remover fisicamente as previstas futuras não editadas: nunca foram vistas como
-- dado do usuário e liberar a chave permite regenerar na retomada.
-- -----------------------------------------------------------------------------
create or replace function public.purge_future_occurrences(p_recurrence uuid, p_from date)
returns integer
security invoker set search_path = public
language plpgsql as $fn$
declare v_count integer;
begin
  delete from public.transactions t
   where t.recurrence_id = p_recurrence
     and t.user_id = (select auth.uid())
     and t.status = 'previsto'
     and t.is_detached = false
     and t.deleted_at is null
     and t.date >= p_from;
  get diagnostics v_count = row_count;
  return v_count;
end $fn$;

-- -----------------------------------------------------------------------------
-- Motor de parcelamento (seção 5.2, RN15, RN16, RN18)
-- Roda de forma síncrona, dentro de uma única transação.
-- -----------------------------------------------------------------------------
create or replace function public.create_purchase(
  p_bank_id        uuid,
  p_purchase_date  date,
  p_description    text,
  p_total_cents    bigint,
  p_count          smallint,
  p_current_number smallint default 1,
  p_current_due    date default null
) returns uuid
security invoker set search_path = public
language plpgsql as $fn$
declare
  v_user      uuid := (select auth.uid());
  v_first_due date;
  v_base      bigint;
  v_resto     bigint;
  v_id        uuid;
begin
  if v_user is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;
  if p_current_number < 1 or p_current_number > p_count then
    raise exception 'parcela atual fora do intervalo' using errcode = 'P0001';
  end if;

  -- reconstitui a agenda a partir do vencimento da parcela atual (RN18)
  v_first_due := (coalesce(p_current_due, p_purchase_date)
                  - ((p_current_number - 1) || ' months')::interval)::date;

  v_base  := p_total_cents / p_count;              -- divisão inteira
  v_resto := p_total_cents - v_base * p_count;

  insert into public.card_purchases
    (user_id, bank_id, purchase_date, description, total_cents,
     installments_count, first_due_date)
  values (v_user, p_bank_id, p_purchase_date, p_description, p_total_cents,
          p_count, v_first_due)
  returning id into v_id;

  insert into public.card_installments
    (user_id, purchase_id, number, due_date, amount_cents, paid_at)
  select v_user, v_id, k,
         (v_first_due + ((k - 1) || ' months')::interval)::date,
         v_base + case when k = 1 then v_resto else 0 end,   -- RN15
         case when k < p_current_number
              then (v_first_due + ((k - 1) || ' months')::interval)::date
              else null end                                   -- RN18
  from generate_series(1, p_count) as k;

  return v_id;
end $fn$;

-- Edição estrutural: só enquanto nenhuma parcela estiver paga (seção 5.2).
create or replace function public.rebuild_installments(
  p_purchase       uuid,
  p_total_cents    bigint,
  p_count          smallint,
  p_current_number smallint,
  p_current_due    date
) returns void
security invoker set search_path = public
language plpgsql as $fn$
declare
  v_user      uuid := (select auth.uid());
  v_first_due date;
  v_base      bigint;
  v_resto     bigint;
  v_paid      integer;
begin
  select count(*) into v_paid
    from public.card_installments
   where purchase_id = p_purchase and paid_at is not null and deleted_at is null;
  if v_paid > 0 then
    raise exception 'compra com parcela paga não aceita edição estrutural'
      using errcode = 'P0001';
  end if;

  v_first_due := (p_current_due - ((p_current_number - 1) || ' months')::interval)::date;
  v_base  := p_total_cents / p_count;
  v_resto := p_total_cents - v_base * p_count;

  delete from public.card_installments where purchase_id = p_purchase;

  update public.card_purchases
     set total_cents = p_total_cents,
         installments_count = p_count,
         first_due_date = v_first_due
   where id = p_purchase;

  insert into public.card_installments
    (user_id, purchase_id, number, due_date, amount_cents, paid_at)
  select v_user, p_purchase, k,
         (v_first_due + ((k - 1) || ' months')::interval)::date,
         v_base + case when k = 1 then v_resto else 0 end,
         case when k < p_current_number
              then (v_first_due + ((k - 1) || ' months')::interval)::date
              else null end
  from generate_series(1, p_count) as k;
end $fn$;

-- Quitação antecipada (RN20)
create or replace function public.settle_purchase(p_purchase uuid, p_date date)
returns integer
security invoker set search_path = public
language plpgsql as $fn$
declare v_count integer;
begin
  update public.card_installments
     set paid_at = p_date
   where purchase_id = p_purchase and paid_at is null and deleted_at is null;
  get diagnostics v_count = row_count;

  update public.card_purchases set settled_at = p_date where id = p_purchase;
  return v_count;
end $fn$;

-- -----------------------------------------------------------------------------
-- Patrimônio disponível na data (RN05) — trava do resgate
-- -----------------------------------------------------------------------------
create or replace function public.patrimonio_em(p_date date, p_exclude uuid default null)
returns bigint
security invoker set search_path = public
language sql stable as $fn$
  select coalesce(sum(case when kind = 'aporte' then amount_cents
                           when kind = 'resgate' then -amount_cents
                           else 0 end), 0)::bigint
  from public.transactions
  where user_id = (select auth.uid())
    and deleted_at is null
    and status = 'efetivado'
    and kind in ('aporte', 'resgate')
    and date <= p_date
    and (p_exclude is null or id <> p_exclude);
$fn$;

-- -----------------------------------------------------------------------------
-- Exclusão de categoria com reatribuição (RN14)
-- -----------------------------------------------------------------------------
create or replace function public.delete_category(p_id uuid, p_reassign_to uuid default null)
returns integer
security invoker set search_path = public
language plpgsql as $fn$
declare
  v_user   uuid := (select auth.uid());
  v_nature nature_t;
  v_system boolean;
  v_dest   uuid;
  v_moved  integer := 0;
  v_n      integer;
begin
  select nature, is_system into v_nature, v_system
    from public.categories where id = p_id and user_id = v_user and deleted_at is null;
  if v_nature is null then
    raise exception 'categoria não encontrada' using errcode = 'P0002';
  end if;
  if v_system then
    raise exception 'categoria de sistema não pode ser excluída' using errcode = 'P0001';
  end if;

  v_dest := p_reassign_to;
  if v_dest is null then
    select id into v_dest from public.categories
     where user_id = v_user and nature = v_nature and is_system and deleted_at is null;
  end if;
  if v_dest is null or v_dest = p_id then
    raise exception 'destino de reatribuição inválido' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.categories
                  where id = v_dest and user_id = v_user
                    and nature = v_nature and deleted_at is null) then
    raise exception 'destino precisa ser da mesma natureza' using errcode = 'P0001';
  end if;

  update public.transactions
     set category_id = v_dest
   where user_id = v_user and category_id = p_id;
  get diagnostics v_n = row_count;
  v_moved := v_moved + v_n;

  update public.recurrences
     set category_id = v_dest
   where user_id = v_user and category_id = p_id;
  get diagnostics v_n = row_count;
  v_moved := v_moved + v_n;

  update public.categories
     set deleted_at = now()
   where id = p_id and user_id = v_user;

  return v_moved;
end $fn$;

-- -----------------------------------------------------------------------------
-- Exclusão de conta (RN24, LGPD) — apagamento físico em cascata
-- -----------------------------------------------------------------------------
create or replace function public.delete_account()
returns void
security definer set search_path = public
language plpgsql as $fn$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;

  delete from public.card_installments where user_id = v_user;
  delete from public.card_purchases    where user_id = v_user;
  delete from public.banks             where user_id = v_user;
  delete from public.transactions      where user_id = v_user;
  delete from public.recurrences       where user_id = v_user;
  delete from public.categories        where user_id = v_user;
  delete from public.audit_log         where user_id = v_user;
  delete from public.profiles          where id = v_user;

  -- Remover do Auth exige privilégio sobre auth.users. A função é security
  -- definer e pertence ao dono das migrações, que tem esse privilégio no
  -- Supabase. Se faltar, o erro precisa ser claro em vez de deixar um login
  -- órfão sem nenhum dado atrás.
  begin
    delete from auth.users where id = v_user;
  exception when insufficient_privilege then
    raise exception 'Os dados foram apagados, mas o login não pôde ser removido. Aplique a migração 0004 com o papel dono do projeto (postgres).'
      using errcode = 'P0001';
  end;
end $fn$;

-- -----------------------------------------------------------------------------
-- Permissões de execução
-- -----------------------------------------------------------------------------
revoke all on function public.generate_occurrences(uuid, date) from public;
revoke all on function public.effectuate_due(uuid)             from public;
revoke all on function public.process_daily()                  from public;

grant execute on function public.today_brt()                                        to authenticated;
grant execute on function public.ensure_occurrences(date, date)                     to authenticated;
grant execute on function public.purge_future_occurrences(uuid, date)               to authenticated;
grant execute on function public.create_purchase(uuid, date, text, bigint, smallint, smallint, date) to authenticated;
grant execute on function public.rebuild_installments(uuid, bigint, smallint, smallint, date)        to authenticated;
grant execute on function public.settle_purchase(uuid, date)                        to authenticated;
grant execute on function public.patrimonio_em(date, uuid)                          to authenticated;
grant execute on function public.delete_category(uuid, uuid)                        to authenticated;
grant execute on function public.delete_account()                                   to authenticated;
