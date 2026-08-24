'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, fromPostgrest, ok } from '@/lib/result'
import { categorySchema, fieldErrorsOf } from '@/lib/validation'
import type { CategoryRow } from '@/lib/database.types'

/**
 * Revalida a árvore inteira de /app em vez de listar rota por rota: os mesmos
 * números aparecem em telas diferentes, e uma lista de caminhos vira número
 * velho em tela na primeira vez que alguém move uma rota.
 */
function revalidar() {
  revalidatePath('/app', 'layout')
}

export async function createCategory(input: unknown): Promise<ActionResult<CategoryRow>> {
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Confira os campos.', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  if ((count ?? 0) >= 200) {
    return fail('RULE_VIOLATION', 'Limite de 200 categorias atingido.')
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ nature: parsed.data.nature, name: parsed.data.name })
    .select('*')
    .single()

  if (error) return fromPostgrest(error)
  revalidar()
  return ok(data as CategoryRow)
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  const nome = name.trim()
  if (!nome || nome.length > 60) {
    return fail('VALIDATION', 'Confira os campos.', { name: 'Nome entre 1 e 60 caracteres.' })
  }

  const supabase = await createClient()
  const { data: atual } = await supabase
    .from('categories')
    .select('is_system')
    .eq('id', id)
    .maybeSingle()

  if (atual?.is_system) {
    return fail('RULE_VIOLATION', '"Sem categoria" não pode ser renomeada.')
  }

  const { error } = await supabase.from('categories').update({ name: nome }).eq('id', id)
  if (error) return fromPostgrest(error)
  revalidar()
  return ok()
}

/** Arquivar tira das opções de novo lançamento e preserva histórico e filtros. */
export async function setCategoryArchived(id: string, archived: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: atual } = await supabase
    .from('categories')
    .select('is_system')
    .eq('id', id)
    .maybeSingle()

  if (atual?.is_system) {
    return fail('RULE_VIOLATION', '"Sem categoria" não pode ser arquivada.')
  }

  const { error } = await supabase.from('categories').update({ is_archived: archived }).eq('id', id)
  if (error) return fromPostgrest(error)
  revalidar()
  return ok()
}

/**
 * RN14: excluir exige destino. Sem destino informado, tudo vai para
 * "Sem categoria". Nenhum lançamento fica órfão.
 */
export async function deleteCategory(
  id: string,
  reassignToId?: string | null,
): Promise<ActionResult<{ moved: number }>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('delete_category', {
    p_id: id,
    p_reassign_to: reassignToId ?? null,
  })

  if (error) return fromPostgrest(error)
  revalidar()
  return ok({ moved: Number(data ?? 0) })
}
