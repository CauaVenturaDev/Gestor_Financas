-- =============================================================================
-- 0009_month_page.sql — Uma chamada só para montar a tela do mês
--
-- Antes, abrir o mês custava quatro idas ao banco em sequência: garantir as
-- ocorrências recorrentes, somar os totais e, no relatório, as duas quebras por
-- categoria. Cada ida é uma viagem de rede, e é a viagem que pesa — não a
-- consulta. Juntar tudo numa função só troca quatro viagens por uma.
-- =============================================================================

create or replace function public.month_page(
  p_ym          date,
  p_com_quebra  boolean default false
) returns jsonb
security invoker set search_path = public
language plpgsql as $fn$
declare
  v_out jsonb;
begin
  -- materializa o mês e o seguinte, e efetiva o que venceu
  perform public.ensure_occurrences(p_ym, (date_trunc('month', p_ym) + interval '1 month')::date);

  v_out := public.month_overview(p_ym);

  if p_com_quebra then
    v_out := v_out
      || jsonb_build_object('quebraRealizado', public.category_breakdown(p_ym, false))
      || jsonb_build_object('quebraProjetado', public.category_breakdown(p_ym, true));
  end if;

  return v_out;
end $fn$;

grant execute on function public.month_page(date, boolean) to authenticated;
