-- =============================================================================
-- 0005_reports.sql — Agregações de leitura (seções 4 e 8)
-- Nada de saldo armazenado: tudo derivado, o que elimina bug de sincronização.
-- =============================================================================

-- Visão do mês: Realizado, Projetado e comprometido no cartão (RN02–RN04, RN09, RN21)
create or replace function public.month_overview(p_ym date)
returns jsonb
security invoker set search_path = public
language plpgsql stable as $fn$
declare
  v_user  uuid := (select auth.uid());
  v_ini   date := date_trunc('month', p_ym)::date;
  v_fim   date := (date_trunc('month', p_ym) + interval '1 month')::date;  -- exclusivo
  v_ant   bigint;
  r_rec bigint; r_des bigint; r_apo bigint; r_res bigint;
  p_rec bigint; p_des bigint; p_apo bigint; p_res bigint;
  v_cartao bigint;
  v_patr  bigint;
  r_lucro bigint; r_saldo bigint; p_lucro bigint; p_saldo bigint;
begin
  -- saldo acumulado até o fim do mês anterior (RN04)
  select coalesce(sum(case kind
           when 'receita' then amount_cents
           when 'resgate' then amount_cents
           else -amount_cents end), 0)
    into v_ant
    from public.transactions
   where user_id = v_user and deleted_at is null
     and status = 'efetivado' and amount_cents is not null and date < v_ini;

  -- Realizado (só efetivados)
  select coalesce(sum(amount_cents) filter (where kind = 'receita'), 0),
         coalesce(sum(amount_cents) filter (where kind = 'despesa'), 0),
         coalesce(sum(amount_cents) filter (where kind = 'aporte'),  0),
         coalesce(sum(amount_cents) filter (where kind = 'resgate'), 0)
    into r_rec, r_des, r_apo, r_res
    from public.transactions
   where user_id = v_user and deleted_at is null and status = 'efetivado'
     and amount_cents is not null and date >= v_ini and date < v_fim;

  -- Projetado (efetivados + previstos com valor definido)
  select coalesce(sum(amount_cents) filter (where kind = 'receita'), 0),
         coalesce(sum(amount_cents) filter (where kind = 'despesa'), 0),
         coalesce(sum(amount_cents) filter (where kind = 'aporte'),  0),
         coalesce(sum(amount_cents) filter (where kind = 'resgate'), 0)
    into p_rec, p_des, p_apo, p_res
    from public.transactions
   where user_id = v_user and deleted_at is null
     and amount_cents is not null and date >= v_ini and date < v_fim;

  -- linha informativa: parcelas com vencimento no mês (RN19, RN21)
  select coalesce(sum(amount_cents), 0) into v_cartao
    from public.card_installments
   where user_id = v_user and deleted_at is null
     and due_date >= v_ini and due_date < v_fim;

  -- patrimônio acumulado até o fim do mês (RN05)
  select coalesce(sum(case when kind = 'aporte' then amount_cents else -amount_cents end), 0)
    into v_patr
    from public.transactions
   where user_id = v_user and deleted_at is null and status = 'efetivado'
     and amount_cents is not null and kind in ('aporte','resgate') and date < v_fim;

  r_lucro := r_rec - r_des - r_apo;            -- RN02
  r_saldo := r_lucro + r_res;                  -- RN03
  p_lucro := p_rec - p_des - p_apo;
  p_saldo := p_lucro + p_res;

  return jsonb_build_object(
    'ym', to_char(v_ini, 'YYYY-MM'),
    'realizado', jsonb_build_object(
      'receitas', r_rec, 'despesas', r_des, 'aportes', r_apo, 'resgates', r_res,
      'lucro', r_lucro, 'saldoMes', r_saldo, 'saldoAcumulado', v_ant + r_saldo),
    'projetado', jsonb_build_object(
      'receitas', p_rec, 'despesas', p_des, 'aportes', p_apo, 'resgates', p_res,
      'lucro', p_lucro, 'saldoMes', p_saldo, 'saldoAcumulado', v_ant + p_saldo),
    'saldoAnterior', v_ant,
    'patrimonio', v_patr,
    'comprometidoCartao', v_cartao
  );
end $fn$;

-- Patrimônio investido mês a mês (RN05)
create or replace function public.patrimonio_mensal()
returns jsonb
security invoker set search_path = public
language plpgsql stable as $fn$
declare
  v_user uuid := (select auth.uid());
  v_out  jsonb;
  v_tot  bigint;
begin
  select coalesce(jsonb_agg(x order by x->>'ym'), '[]'::jsonb) into v_out
  from (
    select jsonb_build_object(
             'ym', to_char(m.ym, 'YYYY-MM'),
             'aportes', m.aportes,
             'resgates', m.resgates,
             'liquido', m.aportes - m.resgates,
             'acumulado', sum(m.aportes - m.resgates) over (order by m.ym)
           ) as x
    from (
      select date_trunc('month', date)::date as ym,
             coalesce(sum(amount_cents) filter (where kind = 'aporte'), 0)  as aportes,
             coalesce(sum(amount_cents) filter (where kind = 'resgate'), 0) as resgates
        from public.transactions
       where user_id = v_user and deleted_at is null and status = 'efetivado'
         and amount_cents is not null and kind in ('aporte','resgate')
       group by 1
    ) m
  ) s;

  select coalesce(sum(case when kind = 'aporte' then amount_cents else -amount_cents end), 0)
    into v_tot
    from public.transactions
   where user_id = v_user and deleted_at is null and status = 'efetivado'
     and amount_cents is not null and kind in ('aporte','resgate')
     and date <= public.today_brt();

  return jsonb_build_object('totalCents', v_tot, 'meses', v_out);
end $fn$;

-- Projeção de comprometimento futuro no cartão (RN19)
-- Cada mês futuro soma apenas parcelas não pagas, no total e por banco.
create or replace function public.card_projection(p_months integer default 12)
returns jsonb
security invoker set search_path = public
language plpgsql stable as $fn$
declare
  v_user uuid := (select auth.uid());
  v_ini  date := date_trunc('month', public.today_brt())::date;
begin
  return (
    select coalesce(jsonb_agg(
             jsonb_build_object('ym', to_char(s.ym, 'YYYY-MM'),
                                'totalCents', s.total,
                                'porBanco', s.por_banco)
             order by s.ym), '[]'::jsonb)
    from (
      select g.ym::date as ym,
             coalesce((
               select sum(i.amount_cents)
                 from public.card_installments i
                where i.user_id = v_user and i.deleted_at is null and i.paid_at is null
                  and i.due_date >= g.ym::date
                  and i.due_date < (g.ym + interval '1 month')::date
             ), 0) as total,
             coalesce((
               select jsonb_agg(jsonb_build_object('bankId', x.bank_id,
                                                   'bankName', x.name,
                                                   'totalCents', x.total)
                                order by x.name)
                 from (
                   select p.bank_id, bk.name, sum(i.amount_cents) as total
                     from public.card_installments i
                     join public.card_purchases p on p.id = i.purchase_id
                     join public.banks bk         on bk.id = p.bank_id
                    where i.user_id = v_user and i.deleted_at is null and i.paid_at is null
                      and i.due_date >= g.ym::date
                      and i.due_date < (g.ym + interval '1 month')::date
                    group by p.bank_id, bk.name
                 ) x
             ), '[]'::jsonb) as por_banco
      from generate_series(v_ini,
                           (v_ini + ((p_months - 1) || ' months')::interval)::date,
                           interval '1 month') as g(ym)
    ) s
  );
end $fn$;

grant execute on function public.month_overview(date)     to authenticated;
grant execute on function public.patrimonio_mensal()      to authenticated;
grant execute on function public.card_projection(integer) to authenticated;
