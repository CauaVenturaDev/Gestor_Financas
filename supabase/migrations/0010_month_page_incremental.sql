-- =============================================================================
-- 0010_month_page_incremental.sql — Parar de reescrever a cada mês aberto
--
-- month_page materializava as ocorrências recorrentes e rodava a efetivação
-- toda vez que um mês era aberto. As duas são escritas, e escrita aqui dispara
-- os gatilhos de auditoria: navegar entre meses ficava caro por um trabalho que
-- já estava feito.
--
-- Agora o perfil guarda o que já foi materializado e quando foi efetivado pela
-- última vez. No caminho comum, abrir um mês volta a ser só leitura.
-- =============================================================================

alter table public.profiles
  add column if not exists ensured_from    date,
  add column if not exists ensured_through date,
  add column if not exists effectuated_on  date;

comment on column public.profiles.ensured_from is
  'Início da faixa contínua de meses já materializada pelo motor de recorrência.';
comment on column public.profiles.ensured_through is
  'Fim dessa faixa. Um salto de vários meses reinicia a faixa em vez de esticá-la.';
comment on column public.profiles.effectuated_on is
  'Último dia em que os previstos vencidos foram efetivados.';

create or replace function public.month_page(
  p_ym         date,
  p_com_quebra boolean default false
) returns jsonb
security invoker set search_path = public
language plpgsql as $fn$
declare
  v_user uuid := (select auth.uid());
  v_ini  date := date_trunc('month', p_ym)::date;
  v_fim  date := (date_trunc('month', p_ym) + interval '1 month')::date;
  v_de   date;
  v_ate  date;
  v_eff  date;
  v_out  jsonb;
begin
  select ensured_from, ensured_through, effectuated_on
    into v_de, v_ate, v_eff
    from public.profiles
   where id = v_user;

  -- materializa só o que ainda falta
  if v_de is null or v_ini < v_de or v_fim > v_ate then
    perform public.generate_occurrences(v_user, v_ini);
    perform public.generate_occurrences(v_user, v_fim);

    if v_de is null or v_ini > v_ate or v_fim < v_de then
      -- salto: a faixa nova não encosta na antiga, então recomeça nela
      update public.profiles
         set ensured_from = v_ini, ensured_through = v_fim
       where id = v_user;
    else
      update public.profiles
         set ensured_from    = least(ensured_from, v_ini),
             ensured_through = greatest(ensured_through, v_fim)
       where id = v_user;
    end if;
  end if;

  -- efetivar previsto vencido é trabalho de uma vez por dia, não de cada toque
  if v_eff is null or v_eff < public.today_brt() then
    perform public.effectuate_due(v_user);
    update public.profiles set effectuated_on = public.today_brt() where id = v_user;
  end if;

  v_out := public.month_overview(p_ym);

  if p_com_quebra then
    v_out := v_out
      || jsonb_build_object('quebraRealizado', public.category_breakdown(p_ym, false))
      || jsonb_build_object('quebraProjetado', public.category_breakdown(p_ym, true));
  end if;

  return v_out;
end $fn$;

-- Mexer numa regra invalida o que já foi materializado: a próxima abertura de
-- mês refaz. Sem isso, uma regra nova não apareceria nos meses já visitados.
create or replace function public.invalidate_ensured() returns void
security invoker set search_path = public
language sql as $fn$
  update public.profiles
     set ensured_from = null, ensured_through = null
   where id = (select auth.uid());
$fn$;

grant execute on function public.month_page(date, boolean) to authenticated;
grant execute on function public.invalidate_ensured()      to authenticated;
