-- =============================================================================
-- 0007_relatorio.sql — Quebra por categoria para a aba Relatório
-- A categoria de sistema é tratada como ausência de categoria, igual à interface.
-- =============================================================================

create or replace function public.category_breakdown(
  p_ym                date,
  p_incluir_previstos boolean default false
) returns jsonb
security invoker set search_path = public
language plpgsql stable as $fn$
declare
  v_user uuid := (select auth.uid());
  v_ini  date := date_trunc('month', p_ym)::date;
  v_fim  date := (date_trunc('month', p_ym) + interval '1 month')::date;
begin
  return (
    select coalesce(jsonb_object_agg(k.kind, k.itens), '{}'::jsonb)
    from (
      select g.kind,
             jsonb_agg(jsonb_build_object('nome', g.nome, 'totalCents', g.total)
                       order by g.total desc, g.nome) as itens
      from (
        select tx.kind::text                        as kind,
               coalesce(c.name, 'Sem categoria')    as nome,
               sum(tx.amount_cents)                 as total
          from public.transactions tx
          left join public.categories c
            on c.id = tx.category_id
           and c.is_system = false
           and c.deleted_at is null
         where tx.user_id = v_user
           and tx.deleted_at is null
           and tx.amount_cents is not null
           and (p_incluir_previstos or tx.status = 'efetivado')
           and tx.date >= v_ini
           and tx.date < v_fim
         group by tx.kind::text, coalesce(c.name, 'Sem categoria')
      ) g
      group by g.kind
    ) k
  );
end $fn$;

grant execute on function public.category_breakdown(date, boolean) to authenticated;
