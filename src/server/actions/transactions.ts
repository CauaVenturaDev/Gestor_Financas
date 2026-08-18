'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, fromPostgrest, ok } from '@/lib/result'
import {
  confirmOccurrenceSchema,
  createTransactionSchema,
  fieldErrorsOf,
  updateTransactionSchema,
} from '@/lib/validation'
import { todayISO, ymOf } from '@/lib/date'
import type { Nature, TransactionRow } from '@/lib/database.types'

const NATUREZA_DE: Record<string, Nature> = {
  receita: 'receita',
  despesa: 'despesa',
  aporte: 'investimento',
  resgate: 'investimento',
}

function revalidar() {
  revalidatePath('/app/movimentacoes')
  revalidatePath('/app/movimentacoes/patrimonio')
  revalidatePath('/app/movimentacoes/recorrentes')
}

/**
 * Cria um lançamento. A seção da UI define o kind — o formulário não tem campo
 * de tipo. Data futura nasce prevista (RN09); resgate valida a RN05 antes.
 */
export async function createTransaction(input: unknown): Promise<ActionResult<TransactionRow>> {
  const parsed = createTransactionSchema.safeParse(input)
  if (!parsed.success) {
    return fail('VALIDATION', 'Confira os campos.', fieldErrorsOf(parsed.error))
  }
  const v = parsed.data
  const supabase = await createClient()

  if (v.kind === 'resgate') {
    const erro = await validarResgate(v.date, v.amountCents)
    if (erro) return erro
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      kind: v.kind,
      name: v.name,
      date: v.date,
      amount_cents: v.amountCents,
      note: v.note?.trim() || null,
      category_id: v.categoryId ?? null,
      category_nature: v.categoryId ? NATUREZA_DE[v.kind] : null,
      status: v.date > todayISO() ? 'previsto' : 'efetivado',
    })
    .select('*')
    .single()

  if (error) return fromPostgrest(error)
  revalidar()
  return ok(data as TransactionRow)
}

/**
 * Edita um lançamento. Em ocorrência recorrente com escopo "somente esta",
 * marca is_detached para as propagações futuras não a tocarem (RN13).
 */
export async function updateTransaction(input: unknown): Promise<ActionResult<TransactionRow>> {
  const parsed = updateTransactionSchema.safeParse(input)
  if (!parsed.success) {
    return fail('VALIDATION', 'Confira os campos.', fieldErrorsOf(parsed.error))
  }
  const v = parsed.data
  const supabase = await createClient()

  const { data: atual } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', v.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!atual) return fail('NOT_FOUND', 'Lançamento não encontrado.')
  const tx = atual as TransactionRow

  if (tx.kind === 'resgate') {
    const erro = await validarResgate(v.date, v.amountCents, v.id)
    if (erro) return erro
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({
      name: v.name,
      date: v.date,
      amount_cents: v.amountCents,
      note: v.note?.trim() || null,
      category_id: v.categoryId ?? null,
      category_nature: v.categoryId ? NATUREZA_DE[tx.kind] : null,
      status: tx.status === 'previsto' && v.date > todayISO() ? 'previsto' : 'efetivado',
      is_detached: tx.recurrence_id ? true : tx.is_detached,
    })
    .eq('id', v.id)
    .select('*')
    .single()

  if (error) return fromPostgrest(error)

  // "Esta e futuras": a regra assume o novo valor e as previstas futuras
  // não destacadas são reescritas. Efetivadas passadas nunca mudam (RN13).
  if (v.scope === 'esta_e_futuras' && tx.recurrence_id) {
    await supabase
      .from('recurrences')
      .update({ name: v.name, amount_cents: v.amountCents, category_id: v.categoryId ?? null,
                category_nature: v.categoryId ? NATUREZA_DE[tx.kind] : null })
      .eq('id', tx.recurrence_id)

    await supabase
      .from('transactions')
      .update({ name: v.name, amount_cents: v.amountCents, category_id: v.categoryId ?? null,
                category_nature: v.categoryId ? NATUREZA_DE[tx.kind] : null })
      .eq('recurrence_id', tx.recurrence_id)
      .eq('is_detached', false)
      .eq('status', 'previsto')
      .is('deleted_at', null)
      .gt('date', tx.date)

    // a própria ocorrência editada segue no padrão da regra
    await supabase.from('transactions').update({ is_detached: false }).eq('id', v.id)
  }

  revalidar()
  return ok(data as TransactionRow)
}

/** Soft delete (RN24): some das listas e dos totais, permanece no banco. */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return fromPostgrest(error)
  revalidar()
  return ok()
}

export async function duplicateTransaction(id: string): Promise<ActionResult<TransactionRow>> {
  const supabase = await createClient()
  const { data: origem } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!origem) return fail('NOT_FOUND', 'Lançamento não encontrado.')
  const tx = origem as TransactionRow
  if (tx.amount_cents === null) return fail('RULE_VIOLATION', 'Confirme o valor antes de duplicar.')

  if (tx.kind === 'resgate') {
    const erro = await validarResgate(tx.date, tx.amount_cents)
    if (erro) return erro
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      kind: tx.kind,
      name: tx.name,
      date: tx.date,
      amount_cents: tx.amount_cents,
      note: tx.note,
      category_id: tx.category_id,
      category_nature: tx.category_nature,
      status: tx.date > todayISO() ? 'previsto' : 'efetivado',
    })
    .select('*')
    .single()

  if (error) return fromPostgrest(error)
  revalidar()
  return ok(data as TransactionRow)
}

/** Ocorrência prevista de valor variável: só conta depois da confirmação (RN10). */
export async function confirmOccurrence(input: unknown): Promise<ActionResult<TransactionRow>> {
  const parsed = confirmOccurrenceSchema.safeParse(input)
  if (!parsed.success) {
    return fail('VALIDATION', 'Confira os campos.', fieldErrorsOf(parsed.error))
  }
  const v = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .update({
      amount_cents: v.amountCents,
      ...(v.date ? { date: v.date } : {}),
      status: 'efetivado',
      is_detached: true,
    })
    .eq('id', v.id)
    .is('deleted_at', null)
    .select('*')
    .single()

  if (error) return fromPostgrest(error)
  revalidar()
  return ok(data as TransactionRow)
}

/** RN05: resgate maior que o patrimônio disponível na data é bloqueado. */
async function validarResgate(
  date: string,
  amountCents: number,
  excludeId?: string,
): Promise<ActionResult<never> | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('patrimonio_em', {
    p_date: date,
    p_exclude: excludeId ?? null,
  })
  if (error) return fromPostgrest(error)

  const disponivel = Number(data ?? 0)
  if (amountCents > disponivel) {
    const { formatBRL } = await import('@/lib/money')
    return fail(
      'RULE_VIOLATION',
      `O resgate é maior que o patrimônio investido nessa data (${formatBRL(disponivel)}).`,
      { amountCents: `Máximo disponível: ${formatBRL(disponivel)}` },
    )
  }
  return null
}

export async function revalidateMonth(ym: string): Promise<void> {
  if (ymOf(`${ym}-01`)) revalidar()
}
