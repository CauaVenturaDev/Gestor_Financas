'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, fromPostgrest, ok } from '@/lib/result'
import { createPurchaseSchema, fieldErrorsOf } from '@/lib/validation'
import { isValidISODate } from '@/lib/date'
import type { CardPurchaseRow } from '@/lib/database.types'

function revalidar(purchaseId?: string) {
  revalidatePath('/app/cartoes')
  revalidatePath('/app/cartoes/projecao')
  revalidatePath('/app/movimentacoes')
  if (purchaseId) revalidatePath(`/app/cartoes/compra/${purchaseId}`)
}

/** Motor de parcelamento: roda inteiro dentro de uma transação SQL (seção 5.2). */
export async function createPurchase(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createPurchaseSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Confira os campos.', fieldErrorsOf(parsed.error))
  const v = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_purchase', {
    p_bank_id: v.bankId,
    p_purchase_date: v.purchaseDate,
    p_description: v.description,
    p_total_cents: v.totalCents,
    p_count: v.count,
    p_current_number: v.currentNumber,
    p_current_due: v.currentDueDate,
  })

  if (error) return fromPostgrest(error)
  revalidar()
  return ok({ id: String(data) })
}

/** Depois de qualquer pagamento, só descrição e observação mudam (seção 5.2). */
export async function updatePurchase(
  id: string,
  patch: {
    description?: string
    purchaseDate?: string
    bankId?: string
    totalCents?: number
    count?: number
    currentNumber?: number
    currentDueDate?: string
  },
): Promise<ActionResult> {
  const supabase = await createClient()

  const { count: pagas } = await supabase
    .from('card_installments')
    .select('id', { count: 'exact', head: true })
    .eq('purchase_id', id)
    .not('paid_at', 'is', null)
    .is('deleted_at', null)

  const temPagamento = (pagas ?? 0) > 0
  const mudaEstrutura =
    patch.totalCents !== undefined ||
    patch.count !== undefined ||
    patch.bankId !== undefined ||
    patch.currentDueDate !== undefined

  if (temPagamento && mudaEstrutura) {
    return fail(
      'RULE_VIOLATION',
      'Essa compra já tem parcela paga: só descrição e data da compra podem mudar. Para um ajuste maior, exclua e cadastre de novo.',
    )
  }

  const campos: Partial<CardPurchaseRow> = {}
  if (patch.description !== undefined) {
    const d = patch.description.trim()
    if (!d || d.length > 160) {
      return fail('VALIDATION', 'Confira os campos.', { description: 'Descrição entre 1 e 160 caracteres.' })
    }
    campos.description = d
  }
  if (patch.purchaseDate !== undefined) {
    if (!isValidISODate(patch.purchaseDate)) {
      return fail('VALIDATION', 'Confira os campos.', { purchaseDate: 'Data inválida.' })
    }
    campos.purchase_date = patch.purchaseDate
  }
  if (patch.bankId !== undefined) campos.bank_id = patch.bankId

  if (Object.keys(campos).length) {
    const { error } = await supabase.from('card_purchases').update(campos).eq('id', id)
    if (error) return fromPostgrest(error)
  }

  if (mudaEstrutura && patch.totalCents && patch.count && patch.currentDueDate) {
    const { error } = await supabase.rpc('rebuild_installments', {
      p_purchase: id,
      p_total_cents: patch.totalCents,
      p_count: patch.count,
      p_current_number: patch.currentNumber ?? 1,
      p_current_due: patch.currentDueDate,
    })
    if (error) return fromPostgrest(error)
  }

  revalidar(id)
  return ok()
}

export async function deletePurchase(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const agora = new Date().toISOString()

  const { error } = await supabase.from('card_purchases').update({ deleted_at: agora }).eq('id', id)
  if (error) return fromPostgrest(error)

  // as parcelas seguem a compra
  await supabase.from('card_installments').update({ deleted_at: agora }).eq('purchase_id', id)

  revalidar(id)
  return ok()
}

export async function payInstallment(id: string, paidAt: string): Promise<ActionResult> {
  if (!isValidISODate(paidAt)) {
    return fail('VALIDATION', 'Confira os campos.', { paidAt: 'Data inválida.' })
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('card_installments')
    .update({ paid_at: paidAt })
    .eq('id', id)
    .is('deleted_at', null)
    .select('purchase_id')
    .maybeSingle()

  if (error) return fromPostgrest(error)
  revalidar((data as { purchase_id: string } | null)?.purchase_id)
  return ok()
}

export async function undoPayInstallment(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('card_installments')
    .update({ paid_at: null })
    .eq('id', id)
    .is('deleted_at', null)
    .select('purchase_id')
    .maybeSingle()

  if (error) return fromPostgrest(error)

  // desfazer pagamento tira a marca de quitação antecipada
  const purchaseId = (data as { purchase_id: string } | null)?.purchase_id
  if (purchaseId) {
    await supabase.from('card_purchases').update({ settled_at: null }).eq('id', purchaseId)
  }

  revalidar(purchaseId)
  return ok()
}

/** RN20: parcelas abertas viram pagas na data informada e saem da projeção. */
export async function settlePurchase(id: string, date: string): Promise<ActionResult<{ paid: number }>> {
  if (!isValidISODate(date)) {
    return fail('VALIDATION', 'Confira os campos.', { date: 'Data inválida.' })
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('settle_purchase', { p_purchase: id, p_date: date })

  if (error) return fromPostgrest(error)
  revalidar(id)
  return ok({ paid: Number(data ?? 0) })
}
