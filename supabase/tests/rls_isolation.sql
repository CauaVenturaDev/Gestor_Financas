-- =============================================================================
-- Teste de isolamento A x B (seção 3 do planejamento).
-- Cria dois usuários, popula dados de B e tenta alcançá-los logado como A,
-- usando o papel `authenticated` de verdade — é assim que o navegador chega.
-- Tudo em begin/rollback. Esperado: apenas NOTICEs de SUCESSO.
-- =============================================================================

begin;

do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (ua, 'a@teste.dev'), (ub, 'b@teste.dev');
  -- dados de B (inseridos com privilégio de dono, fora da RLS)
  insert into public.transactions (user_id, kind, name, date, amount_cents)
  values (ub, 'despesa', 'Segredo do B', public.today_brt(), 12345);
  insert into public.banks (user_id, name) values (ub, 'Banco do B');
  insert into public.recurrences (user_id, kind, name, day_of_month, start_date)
  values (ub, 'despesa', 'Recorrente do B', 10, public.today_brt());

  perform set_config('teste.user_a', ua::text, true);
  perform set_config('teste.user_b', ub::text, true);
end $$;

-- a partir daqui, sessão do navegador: papel authenticated com o JWT de A
set local role authenticated;
select set_config('request.jwt.claims',
       json_build_object('sub', current_setting('teste.user_a'),
                         'role', 'authenticated')::text, true) \gset

do $$
declare n int; b uuid := current_setting('teste.user_b')::uuid;
begin
  -- 1. leitura cruzada: esperado zero linhas em toda tabela
  select count(*) into n from public.transactions      where user_id = b;
  assert n = 0, 'FALHA: A leu transactions de B';
  select count(*) into n from public.card_installments where user_id = b;
  assert n = 0, 'FALHA: A leu card_installments de B';
  select count(*) into n from public.card_purchases    where user_id = b;
  assert n = 0, 'FALHA: A leu card_purchases de B';
  select count(*) into n from public.categories        where user_id = b;
  assert n = 0, 'FALHA: A leu categories de B';
  select count(*) into n from public.recurrences       where user_id = b;
  assert n = 0, 'FALHA: A leu recurrences de B';
  select count(*) into n from public.banks             where user_id = b;
  assert n = 0, 'FALHA: A leu banks de B';
  select count(*) into n from public.profiles          where id = b;
  assert n = 0, 'FALHA: A leu o profile de B';
  raise notice 'SUCESSO: leitura cruzada bloqueada em todas as tabelas';

  -- 1b. as views herdam a RLS (security_invoker = on)
  select count(*) into n from public.v_card_installments where user_id = b;
  assert n = 0, 'FALHA: view v_card_installments vazou dados de B';
  select count(*) into n from public.v_card_purchases    where user_id = b;
  assert n = 0, 'FALHA: view v_card_purchases vazou dados de B';
  raise notice 'SUCESSO: views com security_invoker respeitam a RLS';

  -- 2. insert forjado com user_id de B: esperado violação de policy
  begin
    insert into public.transactions (user_id, kind, name, date, amount_cents)
    values (b, 'despesa', 'forjada', public.today_brt(), 100);
    raise exception 'FALHA: insert forjado passou';
  exception when insufficient_privilege then
    raise notice 'SUCESSO: insert forjado com user_id de terceiro rejeitado';
  end;

  -- 3. update e delete cruzados: esperado zero linhas afetadas
  update public.transactions set name = 'invadida' where user_id = b;
  get diagnostics n = row_count;
  assert n = 0, 'FALHA: A atualizou linha de B';
  delete from public.transactions where user_id = b;
  get diagnostics n = row_count;
  assert n = 0, 'FALHA: A excluiu linha de B';
  update public.banks set name = 'invadido' where user_id = b;
  get diagnostics n = row_count;
  assert n = 0, 'FALHA: A atualizou banco de B';
  raise notice 'SUCESSO: update e delete cruzados sem efeito';

  -- 4. audit_log fechado para authenticated
  begin
    select count(*) into n from public.audit_log;
    assert n = 0, 'FALHA: audit_log visível para authenticated';
    raise notice 'SUCESSO: audit_log não retorna linhas para authenticated';
  exception when insufficient_privilege then
    raise notice 'SUCESSO: audit_log sem permissão para authenticated';
  end;

  -- 5. o próprio dado continua acessível
  insert into public.transactions (kind, name, date, amount_cents)
  values ('receita', 'minha', public.today_brt(), 500);
  select count(*) into n from public.transactions where name = 'minha';
  assert n = 1, 'FALHA: A não consegue gravar o próprio lançamento';
  raise notice 'SUCESSO: A grava e lê os próprios dados normalmente';

  raise notice '=========== ISOLAMENTO A x B VERDE ===========';
end $$;

rollback;
