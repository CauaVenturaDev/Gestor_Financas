'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, fromPostgrest, ok } from '@/lib/result'

export async function updateDisplayName(name: string): Promise<ActionResult> {
  const nome = name.trim()
  if (!nome || nome.length > 80) {
    return fail('VALIDATION', 'Confira os campos.', { nome: 'Nome entre 1 e 80 caracteres.' })
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return fail('AUTH', 'Sessão expirada.')

  const { error } = await supabase.from('profiles').update({ display_name: nome }).eq('id', auth.user.id)
  if (error) return fromPostgrest(error)

  await supabase.auth.updateUser({ data: { display_name: nome } })
  revalidatePath('/app/conta')
  return ok()
}

export async function changePassword(atual: string, nova: string): Promise<ActionResult> {
  if (nova.length < 8) {
    return fail('VALIDATION', 'Confira os campos.', { nova: 'A senha precisa ter pelo menos 8 caracteres.' })
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.email) return fail('AUTH', 'Sessão expirada.')

  // reautentica antes de trocar: confirma que é a pessoa na frente do aparelho
  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: atual,
  })
  if (erroLogin) return fail('AUTH', 'A senha atual está incorreta.', { atual: 'Senha incorreta.' })

  const { error } = await supabase.auth.updateUser({ password: nova })
  if (error) return fail('VALIDATION', 'Não foi possível trocar a senha.')

  await supabase.auth.signOut({ scope: 'others' })
  return ok()
}

/**
 * Exclusão de conta (RN24 / LGPD): apaga tudo fisicamente em cascata e remove
 * o usuário do Auth. Não é soft delete — é a única exceção da regra.
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  if (confirmation.trim().toUpperCase() !== 'EXCLUIR') {
    return fail('VALIDATION', 'Digite EXCLUIR para confirmar.', {
      confirmation: 'Digite EXCLUIR exatamente como está escrito.',
    })
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_account')
  if (error) return fromPostgrest(error)

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/entrar?conta=excluida')
}
