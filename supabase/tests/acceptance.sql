-- =============================================================================
-- Teste de aceite — reproduz o exemplo completo da seção 8 do planejamento.
-- Congela today_brt() em 2026-03-25 dentro da transação (DDL é transacional),
-- de modo que o resultado não depende do dia em que o teste roda.
-- Tudo em begin/rollback: não deixa resíduo no banco.
-- Esperado: apenas NOTICEs de SUCESSO.
-- =============================================================================

begin;

create or replace function public.today_brt() returns date
language sql stable set search_path = public as $$ select date '2026-03-25' $$;

do $$
declare
  ua uuid := gen_random_uuid();
  cat_rec uuid; cat_des uuid; cat_inv uuid;
  ov jsonb; r jsonb; p jsonb;
  banco uuid; compra1 uuid; compra2 uuid;
  n bigint; m int;
  rule_id uuid;
begin
  -- ---------------------------------------------------------------- cadastro
  insert into auth.users (id, email) values (ua, 'a@teste.dev');
  perform set_config('request.jwt.claims',
                     json_build_object('sub', ua, 'role', 'authenticated')::text, true);

  select count(*) into n from public.categories where user_id = ua;
  assert n = 19, format('FALHA: seed criou %s categorias, esperado 19', n);
  select count(*) into n from public.categories where user_id = ua and is_system;
  assert n = 3, 'FALHA: faltou "Sem categoria" em alguma natureza';
  raise notice 'SUCESSO: cadastro cria perfil + 3 categorias de sistema + 16 padrão';

  select id into cat_rec from public.categories
   where user_id = ua and nature = 'receita' and name = 'Salário';
  select id into cat_des from public.categories
   where user_id = ua and nature = 'despesa' and name = 'Moradia';
  select id into cat_inv from public.categories
   where user_id = ua and nature = 'investimento' and name = 'Renda fixa';

  -- ------------------------------------------------- estado até fim de fevereiro
  -- saldo acumulado 3.100,00 e patrimônio investido 9.750,00
  insert into public.transactions (user_id, kind, name, date, amount_cents, category_id, category_nature) values
    (ua, 'receita', 'Saldo inicial',  '2025-12-01', 1285000, cat_rec, 'receita'),
    (ua, 'aporte',  'Carteira antiga','2025-12-15',  675000, cat_inv, 'investimento'),
    (ua, 'aporte',  'Aporte jan',     '2026-01-06',  150000, cat_inv, 'investimento'),
    (ua, 'aporte',  'Aporte fev',     '2026-02-06',  150000, cat_inv, 'investimento');

  -- --------------------------------------------------- lançamentos de março/2026
  insert into public.transactions (user_id, kind, name, date, amount_cents, category_id, category_nature) values
    (ua, 'receita', 'Salário',         '2026-03-05', 650000, cat_rec, 'receita'),
    (ua, 'receita', 'Freela de logo',  '2026-03-12', 120000, null, null),
    (ua, 'despesa', 'Aluguel',         '2026-03-10', 180000, cat_des, 'despesa'),
    (ua, 'despesa', 'Mercado',         '2026-03-14',  98645, null, null),
    (ua, 'despesa', 'Energia',         '2026-03-15',  21355, null, null),
    (ua, 'despesa', 'Lazer',           '2026-03-21',  60000, null, null),
    (ua, 'despesa', 'Assinaturas',     '2026-03-03',  10000, null, null),
    (ua, 'aporte',  'CDB',             '2026-03-06', 120000, cat_inv, 'investimento'),
    (ua, 'aporte',  'Reserva',         '2026-03-06',  30000, cat_inv, 'investimento'),
    (ua, 'resgate', 'Resgate reserva', '2026-03-22',  40000, cat_inv, 'investimento');

  -- prevista: Internet 120,00 em 28/03 (RN09)
  insert into public.transactions (user_id, kind, name, date, amount_cents, status) values
    (ua, 'despesa', 'Internet', '2026-03-28', 12000, 'previsto');

  -- --------------------------------------------------------- indicadores do mês
  ov := public.month_overview('2026-03-01');
  r  := ov -> 'realizado';
  p  := ov -> 'projetado';

  assert (r->>'receitas')::bigint       = 770000,  format('FALHA receitas: %s',       r->>'receitas');
  assert (r->>'despesas')::bigint       = 370000,  format('FALHA despesas: %s',       r->>'despesas');
  assert (r->>'aportes')::bigint        = 150000,  format('FALHA investido: %s',      r->>'aportes');
  assert (r->>'lucro')::bigint          = 250000,  format('FALHA lucro: %s',          r->>'lucro');
  assert (r->>'resgates')::bigint       =  40000,  format('FALHA resgates: %s',       r->>'resgates');
  assert (r->>'saldoMes')::bigint       = 290000,  format('FALHA saldo do mês: %s',   r->>'saldoMes');
  assert (r->>'saldoAcumulado')::bigint = 600000,  format('FALHA saldo acumulado: %s',r->>'saldoAcumulado');
  assert (ov->>'patrimonio')::bigint    = 1085000, format('FALHA patrimônio: %s',     ov->>'patrimonio');
  raise notice 'SUCESSO: os oito indicadores de março batem com a tabela da seção 8';

  assert (p->>'despesas')::bigint       = 382000, format('FALHA despesas projetadas: %s', p->>'despesas');
  assert (p->>'lucro')::bigint          = 238000, format('FALHA lucro projetado: %s',     p->>'lucro');
  assert (p->>'saldoMes')::bigint       = 278000, format('FALHA saldo projetado: %s',     p->>'saldoMes');
  assert (p->>'saldoAcumulado')::bigint = 588000, format('FALHA acumulado projetado: %s', p->>'saldoAcumulado');
  raise notice 'SUCESSO: Projetado do dia 25/03 bate (RN09)';

  -- RN02: resgate não mexe no lucro; RN03: sobe o saldo do mês
  assert (r->>'lucro')::bigint + (r->>'resgates')::bigint = (r->>'saldoMes')::bigint,
    'FALHA: saldo do mês não é lucro + resgates';

  -- --------------------------------------------------------- patrimônio mês a mês
  ov := public.patrimonio_mensal();
  assert (ov->>'totalCents')::bigint = 1085000, format('FALHA patrimônio total: %s', ov->>'totalCents');
  assert (ov->'meses'->-1->>'acumulado')::bigint = 1085000,
    'FALHA: acumulado da última linha diferente do card de patrimônio';
  assert (ov->'meses'->-1->>'liquido')::bigint = 110000,
    format('FALHA líquido de março: %s', ov->'meses'->-1->>'liquido');
  raise notice 'SUCESSO: quebra mensal do patrimônio fecha com o card';

  -- RN05: resgate maior que o patrimônio é bloqueado
  assert public.patrimonio_em('2026-03-22') = 1085000,
    format('FALHA patrimonio_em: %s', public.patrimonio_em('2026-03-22'));

  -- ------------------------------------------------------------------- cartões
  insert into public.banks (user_id, name) values (ua, 'Nubank') returning id into banco;

  compra1 := public.create_purchase(banco, '2026-01-02', 'Geladeira', 280000, 12::smallint, 1::smallint, '2026-01-10');
  compra2 := public.create_purchase(banco, '2026-02-20', 'Passagens', 120000,  3::smallint, 1::smallint, '2026-03-10');

  -- RN15: soma das parcelas fecha com o total, resto na primeira
  select amount_cents into n from public.card_installments where purchase_id = compra1 and number = 1;
  assert n = 23337, format('FALHA parcela 1 da Geladeira: %s', n);
  select amount_cents into n from public.card_installments where purchase_id = compra1 and number = 7;
  assert n = 23333, format('FALHA parcela 7 da Geladeira: %s', n);
  select sum(amount_cents) into n from public.card_installments where purchase_id = compra1;
  assert n = 280000, format('FALHA soma das parcelas: %s', n);
  raise notice 'SUCESSO: 2.800,00 em 12x dá 233,37 + 11 x 233,33 e soma 2.800,00 (RN15)';

  -- RN16: vencimentos mensais a partir do primeiro
  select count(*) into n from public.card_installments
   where purchase_id = compra1 and number = 3 and due_date = '2026-03-10';
  assert n = 1, 'FALHA: vencimento da parcela 3 não caiu em 10/03';

  -- paga as parcelas 1 a 3 da Geladeira e a 1 das Passagens (estado de 25/03)
  update public.card_installments set paid_at = due_date
   where purchase_id = compra1 and number <= 3;
  update public.card_installments set paid_at = due_date
   where purchase_id = compra2 and number = 1;

  -- RN19: fatura do Nubank em março
  select coalesce(sum(i.amount_cents), 0) into n
    from public.card_installments i
    join public.card_purchases c on c.id = i.purchase_id
   where c.bank_id = banco and i.deleted_at is null
     and i.due_date >= '2026-03-01' and i.due_date < '2026-04-01';
  assert n = 63333, format('FALHA fatura de março: %s', n);
  raise notice 'SUCESSO: fatura Nubank de março = 633,33 (RN19)';

  -- RN17: parcela atual e em aberto derivados
  select current_number into m from public.v_card_purchases where id = compra1;
  assert m = 4, format('FALHA parcela atual da Geladeira: %s', m);
  select open_cents into n from public.v_card_purchases where id = compra1;
  assert n = 209997, format('FALHA em aberto da Geladeira: %s', n);
  select open_cents into n from public.v_card_purchases where id = compra2;
  assert n = 80000, format('FALHA em aberto das Passagens: %s', n);
  raise notice 'SUCESSO: parcela atual 4/12 e 2.099,97 em aberto, sem edição manual (RN17)';

  -- comprometido no cartão aparece na Aba 1 como linha informativa (RN21)
  assert (public.month_overview('2026-03-01')->>'comprometidoCartao')::bigint = 63333,
    'FALHA: comprometido no cartão de março';

  -- RN19: projeção soma só parcelas não pagas
  ov := public.card_projection(12);
  assert (ov->0->>'ym') = '2026-03', format('FALHA: projeção começa em %s', ov->0->>'ym');
  assert (ov->1->>'totalCents')::bigint = 63333, format('FALHA projeção abr/26: %s', ov->1->>'totalCents');
  select sum((x->>'totalCents')::bigint) into n
    from jsonb_array_elements(ov) x where x->>'ym' > '2026-03';
  assert n = 289997, format('FALHA comprometido futuro: %s', n);
  raise notice 'SUCESSO: projeção futura = 2.899,97 (RN19)';

  -- RN20: quitação antecipada
  perform public.settle_purchase(compra2, '2026-03-25');
  select open_cents into n from public.v_card_purchases where id = compra2;
  assert n = 0, format('FALHA: quitação antecipada deixou %s em aberto', n);
  assert exists (select 1 from public.v_card_purchases where id = compra2 and status = 'quitada'),
    'FALHA: compra quitada não mudou de status';
  raise notice 'SUCESSO: quitação antecipada zera o aberto e sai da projeção (RN20)';

  -- RN18: compra em andamento importada com parcela atual 5
  perform public.create_purchase(banco, '2025-11-10', 'Notebook', 500000, 10::smallint, 5::smallint, '2026-03-15');
  select count(*) into n from public.card_installments i
    join public.card_purchases c on c.id = i.purchase_id
   where c.description = 'Notebook' and i.paid_at is not null;
  assert n = 4, format('FALHA RN18: nasceram %s parcelas pagas, esperado 4', n);
  select count(*) into n from public.card_installments i
    join public.card_purchases c on c.id = i.purchase_id
   where c.description = 'Notebook' and i.number = 1 and i.due_date = '2025-11-15';
  assert n = 1, 'FALHA RN18: agenda não foi reconstituída para trás';
  raise notice 'SUCESSO: compra com parcela atual 5 nasce com 1 a 4 pagas (RN18)';

  -- ---------------------------------------------------------------- recorrência
  insert into public.recurrences (user_id, kind, name, amount_cents, day_of_month, start_date)
  values (ua, 'despesa', 'Internet fibra', 12000, 31, '2026-04-01')
  returning id into rule_id;

  perform public.generate_occurrences(ua, '2026-04-01');
  perform public.generate_occurrences(ua, '2026-04-01');  -- idempotência (RN12)
  perform public.generate_occurrences(ua, '2026-04-01');
  select count(*) into n from public.transactions where recurrence_id = rule_id;
  assert n = 1, format('FALHA RN12: motor gerou %s ocorrências para o mesmo mês', n);

  -- RN11: dia 31 em mês de 30 cai no último dia
  select count(*) into n from public.transactions
   where recurrence_id = rule_id and date = '2026-04-30';
  assert n = 1, 'FALHA RN11: dia 31 em abril não caiu em 30/04';

  -- futura nasce prevista (RN09)
  select count(*) into n from public.transactions
   where recurrence_id = rule_id and status = 'previsto';
  assert n = 1, 'FALHA: ocorrência futura não nasceu prevista';
  raise notice 'SUCESSO: recorrência idempotente, dia 31 vira 30/04 e futura nasce prevista';

  -- soft delete da ocorrência: o mês não volta (RN12)
  update public.transactions set deleted_at = now() where recurrence_id = rule_id;
  perform public.generate_occurrences(ua, '2026-04-01');
  select count(*) into n from public.transactions
   where recurrence_id = rule_id and deleted_at is null;
  assert n = 0, 'FALHA RN12: ocorrência excluída foi recriada pelo motor';
  raise notice 'SUCESSO: ocorrência excluída não é recriada (RN12)';

  -- --------------------------------------------------------- categorias (RN14)
  select id into cat_des from public.categories
   where user_id = ua and nature = 'despesa' and name = 'Moradia';
  select public.delete_category(cat_des) into m;
  assert m >= 1, 'FALHA RN14: exclusão de categoria não reatribuiu lançamentos';
  select count(*) into n from public.transactions
   where user_id = ua and name = 'Aluguel' and category_id is not null;
  assert n = 1, 'FALHA RN14: lançamento ficou órfão';
  select count(*) into n from public.transactions t
    join public.categories c on c.id = t.category_id
   where t.name = 'Aluguel' and c.is_system;
  assert n = 1, 'FALHA RN14: não migrou para "Sem categoria"';
  raise notice 'SUCESSO: excluir categoria migra os lançamentos para "Sem categoria" (RN14)';

  -- categoria de sistema é indestrutível
  select id into cat_des from public.categories
   where user_id = ua and nature = 'despesa' and is_system;
  begin
    perform public.delete_category(cat_des);
    raise exception 'FALHA: categoria de sistema foi excluída';
  exception when sqlstate 'P0001' then
    raise notice 'SUCESSO: categoria de sistema não pode ser excluída (RN14)';
  end;

  -- ---------------------------------------------------------------- auditoria
  select count(*) into n from public.audit_log where user_id = ua and table_name = 'transactions';
  assert n > 0, 'FALHA RN24: audit_log vazio';
  select count(*) into n from public.audit_log where user_id = ua and action = 'update';
  assert n > 0, 'FALHA RN24: update não gerou linha de auditoria';
  raise notice 'SUCESSO: auditoria grava insert e update com old e new (RN24)';

  -- ----------------------------------------------------------- exclusão de conta
  perform public.delete_account();
  select count(*) into n from public.transactions where user_id = ua;
  assert n = 0, 'FALHA: exclusão de conta deixou transactions';
  select count(*) into n from public.categories where user_id = ua;
  assert n = 0, 'FALHA: exclusão de conta deixou categories';
  select count(*) into n from auth.users where id = ua;
  assert n = 0, 'FALHA: usuário continua no Auth';
  raise notice 'SUCESSO: exclusão de conta apaga tudo fisicamente (LGPD)';

  raise notice '=========== TODOS OS CRITÉRIOS DE ACEITE PASSARAM ===========';
end $$;

rollback;
