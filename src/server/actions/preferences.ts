'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, fromPostgrest, ok } from '@/lib/result'
import { COOKIE_TEMA, type TemaId, ehTemaValido } from '@/lib/theme'

const UM_ANO = 60 * 60 * 24 * 365

/**
 * O tema fica em cookie, não no banco: assim o servidor já renderiza a página
 * com a cor certa e o app nunca pisca branco antes de trocar. O preço é que a
 * escolha é por aparelho.
 */
export async function setTheme(tema: TemaId): Promise<ActionResult> {
  if (!ehTemaValido(tema)) return fail('VALIDATION', 'Tema desconhecido.')

  const jar = await cookies()
  jar.set(COOKIE_TEMA, tema, {
    maxAge: UM_ANO,
    path: '/',
    sameSite: 'lax',
    httpOnly: false, // o client troca o atributo na hora, antes do round trip
  })

  revalidatePath('/', 'layout')
  return ok()
}

export interface PreferenciasAviso {
  notifyEmail: boolean
  notifyTime: string
  notifyDaysBefore: number
}

export async function updateNotificationPrefs(
  prefs: PreferenciasAviso,
): Promise<ActionResult> {
  const dias = Number(prefs.notifyDaysBefore)
  if (!Number.isInteger(dias) || dias < 0 || dias > 30) {
    return fail('VALIDATION', 'Confira os campos.', {
      notifyDaysBefore: 'Entre 0 e 30 dias.',
    })
  }
  if (!/^\d{2}:\d{2}$/.test(prefs.notifyTime)) {
    return fail('VALIDATION', 'Confira os campos.', { notifyTime: 'Horário inválido.' })
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return fail('AUTH', 'Sessão expirada.')

  const { error } = await supabase
    .from('profiles')
    .update({
      notify_email: prefs.notifyEmail,
      notify_time: `${prefs.notifyTime}:00`,
      notify_days_before: dias,
    })
    .eq('id', auth.user.id)

  if (error) return fromPostgrest(error)
  revalidatePath('/app', 'layout')
  return ok()
}
