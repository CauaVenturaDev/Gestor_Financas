'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, fromPostgrest, ok } from '@/lib/result'
import { createRecurrenceSchema, fieldErrorsOf, updateRecurrenceSchema } from '@/lib/validation'
import { addMonthsToYm, currentYm, todayISO, ymToFirstDay, ymToLastDay } from '@/lib/date'
import type { Nature, RecurrenceRow } from '@/lib/database.types'

/**
 * Revalida a árvore inteira de /app em vez de listar rota por rota: os mesmos
 * números aparecem em telas diferentes, e uma lista de caminhos vira número
 * velho em tela na primeira vez que alguém move uma rota.
 */
function revalidar() {
  revalidatePath('/app', 'layout')
}

const NATUREZA_DE: Record<string, Nature> = { receita: 'receita', despesa: 'despesa' }

/**
 * Depois de mexer na regra, materializa o mês corrente e o seguinte — e
 * invalida a faixa já materializada, senão a regra nova não apareceria nos
 * meses que o usuário já visitou.
 */
async function materializar() {
  const supabase = await createClient()
  await supabase.rpc('invalidate_ensured')
  await supabase.rpc('ensure_occurrences', {
    p_start_ym: ymToFirstDay(currentYm()),
    p_end_ym: ymToFirstDay(addMonthsToYm(currentYm(), 1)),
  })
}

export async function createRecurrence(
  input: unknown,
): Promise<ActionResult<{ rule: RecurrenceRow; generated: number }>> {
  const parsed = createRecurrenceSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Confira os campos.', fieldErrorsOf(parsed.error))
  const v = parsed.data

  const supabase = await createClient()
  const { count } = await supabase
    .from('recurrences')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  if ((count ?? 0) >= 100) return fail('RULE_VIOLATION', 'Limite de 100 regras recorrentes atingido.')

  const { data, error } = await supabase
    .from('recurrences')
    .insert({
      kind: v.kind,
      name: v.name,
      note: v.note?.trim() || null,
      category_id: v.categoryId ?? null,
      category_nature: v.categoryId ? NATUREZA_DE[v.kind] : null,
      amount_cents: v.amountCents,
      day_of_month: v.dayOfMonth,
      start_date: ymToFirstDay(v.startYm),
      end_date: v.endYm ? ymToLastDay(v.endYm) : null,
      auto_confirm: v.autoConfirm,
    })
    .select('*')
    .single()

  if (error) return fromPostgrest(error)

  await supabase.rpc('invalidate_ensured')

  // Gera do início da regra (ou do mês corrente, o que for mais recente) até M+1.
  const inicio = v.startYm < currentYm() ? v.startYm : currentYm()
  const { data: gerou } = await supabase.rpc('ensure_occurrences', {
    p_start_ym: ymToFirstDay(inicio),
    p_end_ym: ymToFirstDay(addMonthsToYm(currentYm(), 1)),
  })

  revalidar()
  return ok({ rule: data as RecurrenceRow, generated: Number(gerou ?? 0) })
}

/**
 * Edita a regra. Escopo "esta e futuras" (RN13): a regra muda e as ocorrências
 * previstas futuras não destacadas são reescritas. Efetivadas passadas ficam.
 */
export async function updateRecurrence(input: unknown): Promise<ActionResult<RecurrenceRow>> {
  const parsed = updateRecurrenceSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Confira os campos.', fieldErrorsOf(parsed.error))
  const v = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recurrences')
    .update({
      name: v.name,
      note: v.note?.trim() || null,
      category_id: v.categoryId ?? null,
      category_nature: v.categoryId ? NATUREZA_DE[v.kind] : null,
      amount_cents: v.amountCents,
      day_of_month: v.dayOfMonth,
      start_date: ymToFirstDay(v.startYm),
      end_date: v.endYm ? ymToLastDay(v.endYm) : null,
      auto_confirm: v.autoConfirm,
    })
    .eq('id', v.id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) return fromPostgrest(error)

  // Reescreve as previstas futuras não destacadas e regenera a agenda.
  await supabase
    .from('transactions')
    .update({
      name: v.name,
      note: v.note?.trim() || null,
      amount_cents: v.amountCents,
      category_id: v.categoryId ?? null,
      category_nature: v.categoryId ? NATUREZA_DE[v.kind] : null,
    })
    .eq('recurrence_id', v.id)
    .eq('is_detached', false)
    .eq('status', 'previsto')
    .is('deleted_at', null)
    .gte('date', todayISO())

  await supabase.rpc('purge_future_occurrences', { p_recurrence: v.id, p_from: todayISO() })
  await materializar()

  revalidar()
  return ok(data as RecurrenceRow)
}

/**
 * Pausar: some com as previstas futuras não editadas (nunca foram vistas como
 * dado do usuário) e para de gerar. Retomar volta a gerar: as chaves estão livres.
 */
export async function setRecurrenceStatus(
  id: string,
  status: 'ativa' | 'pausada' | 'encerrada',
  endYm?: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const patch: Partial<RecurrenceRow> = { status }
  if (status === 'encerrada' && endYm) patch.end_date = ymToLastDay(endYm)
  if (status === 'ativa') patch.end_date = null

  const { error } = await supabase
    .from('recurrences')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fromPostgrest(error)

  if (status !== 'ativa') {
    const desde = status === 'encerrada' && endYm ? ymToFirstDay(addMonthsToYm(endYm, 1)) : todayISO()
    await supabase.rpc('purge_future_occurrences', { p_recurrence: id, p_from: desde })
  } else {
    await materializar()
  }

  revalidar()
  return ok()
}

/** Exclui a regra (soft delete). As ocorrências efetivadas ficam no histórico. */
export async function deleteRecurrence(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  await supabase.rpc('purge_future_occurrences', { p_recurrence: id, p_from: todayISO() })
  await supabase.rpc('invalidate_ensured')

  const { error } = await supabase
    .from('recurrences')
    .update({ deleted_at: new Date().toISOString(), status: 'encerrada' })
    .eq('id', id)

  if (error) return fromPostgrest(error)
  revalidar()
  return ok()
}
