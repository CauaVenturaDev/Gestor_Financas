-- =============================================================================
-- 0006_cron.sql — Job diário (seção 5.1)
-- 06:10 UTC = 03:10 em São Paulo.
-- Requer a extensão pg_cron habilitada no projeto (Database > Extensions).
-- O bloco é tolerante: se pg_cron não existir, a migração não quebra — a
-- geração e a efetivação continuam acontecendo sob demanda ao abrir o mês.
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('financas-diario')
      where exists (select 1 from cron.job where jobname = 'financas-diario');
    perform cron.schedule('financas-diario', '10 6 * * *', 'select public.process_daily()');
    raise notice 'cron financas-diario agendado para 06:10 UTC';
  else
    raise notice 'pg_cron não habilitado: pulando o agendamento. Habilite a extensão e rode esta migração de novo.';
  end if;
end $$;
