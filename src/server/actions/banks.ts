'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, fromPostgrest, ok } from '@/lib/result'
import { bankSchema, fieldErrorsOf } from '@/lib/validation'
import type { BankRow } from '@/lib/database.types'

function revalidar() {
  revalidatePath('/app/cartoes')
  revalidatePath('/app/cartoes/bancos')
  revalidatePath('/app/cartoes/projecao')
}

export async function createBank(input: unknown): Promise<ActionResult<BankRow>> {
  const parsed = bankSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Confira os campos.', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { count } = await supabase
    .from('banks')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  if ((count ?? 0) >= 20) return fail('RULE_VIOLATION', 'Limite de 20 bancos atingido.')

  const { data, error } = await supabase
    .from('banks')
    .insert({ name: parsed.data.name })
    .select('*')
    .single()

  if (error) return fromPostgrest(error)
  revalidar()
  return ok(data as BankRow)
}

export async function renameBank(id: string, name: string): Promise<ActionResult> {
  const nome = name.trim()
  if (!nome || nome.length > 60) {
    return fail('VALIDATION', 'Confira os campos.', { name: 'Nome entre 1 e 60 caracteres.' })
  }
  const supabase = await createClient()
  const { error } = await supabase.from('banks').update({ name: nome }).eq('id', id)
  if (error) return fromPostgrest(error)
  revalidar()
  return ok()
}

export async function setBankArchived(id: string, archived: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('banks').update({ is_archived: archived }).eq('id', id)
  if (error) return fromPostgrest(error)
  revalidar()
  return ok()
}

/** Exclusão bloqueada com parcela em aberto; a tela oferece arquivar. */
export async function deleteBank(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: compras } = await supabase
    .from('card_purchases')
    .select('id')
    .eq('bank_id', id)
    .is('deleted_at', null)

  const ids = ((compras ?? []) as { id: string }[]).map((c) => c.id)
  if (ids.length) {
    const { count } = await supabase
      .from('card_installments')
      .select('id', { count: 'exact', head: true })
      .in('purchase_id', ids)
      .is('paid_at', null)
      .is('deleted_at', null)

    if ((count ?? 0) > 0) {
      return fail(
        'RULE_VIOLATION',
        'Esse banco tem parcelas em aberto. Arquive o banco em vez de excluir.',
      )
    }
  }

  const { error } = await supabase
    .from('banks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return fromPostgrest(error)
  revalidar()
  return ok()
}
