'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/env'
import { emailSchema, passwordSchema } from '@/lib/validation'
import { type ActionResult, fail, ok } from '@/lib/result'

export type FormState = ActionResult<{ message?: string }> | null

const ERROS: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  user_already_exists: 'Já existe uma conta com esse e-mail.',
  weak_password: 'Escolha uma senha mais forte.',
  over_email_send_rate_limit: 'Muitas tentativas. Espere alguns minutos.',
  same_password: 'A nova senha precisa ser diferente da atual.',
}

function traduzir(code: string | undefined, fallback: string): string {
  return (code && ERROS[code]) || fallback
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(formData.get('email'))
  const senha = String(formData.get('senha') ?? '')
  const proximo = String(formData.get('proximo') ?? '/app/relatorio')

  if (!email.success) return fail('VALIDATION', 'Confira os campos.', { email: 'E-mail inválido.' })
  if (!senha) return fail('VALIDATION', 'Confira os campos.', { senha: 'Informe a senha.' })

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: senha })

  if (error) {
    return fail(
      error.status === 429 ? 'RATE_LIMIT' : 'AUTH',
      traduzir(error.code, 'Não foi possível entrar. Confira e-mail e senha.'),
    )
  }

  revalidatePath('/', 'layout')
  redirect(proximo.startsWith('/app') ? proximo : '/app/relatorio')
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = emailSchema.safeParse(formData.get('email'))
  const senha = passwordSchema.safeParse(formData.get('senha'))

  const fieldErrors: Record<string, string> = {}
  if (!nome) fieldErrors.nome = 'Informe seu nome.'
  if (nome.length > 80) fieldErrors.nome = 'Máximo de 80 caracteres.'
  if (!email.success) fieldErrors.email = 'E-mail inválido.'
  if (!senha.success) fieldErrors.senha = senha.error?.issues[0]?.message ?? 'Senha inválida.'
  if (Object.keys(fieldErrors).length) return fail('VALIDATION', 'Confira os campos.', fieldErrors)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.data!,
    password: String(formData.get('senha')),
    options: {
      data: { display_name: nome },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/app/relatorio`,
    },
  })

  if (error) {
    return fail(
      error.status === 429 ? 'RATE_LIMIT' : 'VALIDATION',
      traduzir(error.code, 'Não foi possível criar a conta.'),
    )
  }

  // Sem confirmação de e-mail o cadastro já devolve sessão: entra direto.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/app/relatorio')
  }

  return ok({
    message:
      'Conta criada. Enviamos um link de confirmação para o seu e-mail — abra o link para entrar.',
  })
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = emailSchema.safeParse(formData.get('email'))
  if (!email.success) return fail('VALIDATION', 'Confira os campos.', { email: 'E-mail inválido.' })

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/redefinir-senha`,
  })

  if (error && error.status === 429) {
    return fail('RATE_LIMIT', 'Muitas tentativas. Espere alguns minutos e tente de novo.')
  }

  // Resposta sempre igual, exista ou não a conta: não confirma e-mail cadastrado.
  return ok({
    message: 'Se existir uma conta com esse e-mail, o link de recuperação chegou na caixa de entrada.',
  })
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const senha = String(formData.get('senha') ?? '')
  const confirmacao = String(formData.get('confirmacao') ?? '')

  const parsed = passwordSchema.safeParse(senha)
  if (!parsed.success) {
    return fail('VALIDATION', 'Confira os campos.', {
      senha: parsed.error.issues[0]?.message ?? 'Senha inválida.',
    })
  }
  if (senha !== confirmacao) {
    return fail('VALIDATION', 'Confira os campos.', { confirmacao: 'As senhas não são iguais.' })
  }

  const supabase = await createClient()
  const { data: sessao } = await supabase.auth.getUser()
  if (!sessao.user) {
    return fail('AUTH', 'O link expirou. Peça um novo e-mail de recuperação.')
  }

  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) return fail('VALIDATION', traduzir(error.code, 'Não foi possível trocar a senha.'))

  // Derruba as outras sessões: o link de recuperação invalida o que estava aberto.
  await supabase.auth.signOut({ scope: 'others' })

  revalidatePath('/', 'layout')
  redirect('/app/relatorio')
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/entrar')
}
