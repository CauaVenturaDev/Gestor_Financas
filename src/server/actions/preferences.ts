'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, fail, fromPostgrest, ok } from '@/lib/result'
import { type Aparencia, COOKIES, normalizarAparencia } from '@/lib/aparencia'

const UM_ANO = 60 * 60 * 24 * 365

/**
 * A aparência fica em cookie, não no banco: assim o servidor já renderiza a
 * página com a cor certa e o app nunca pisca antes de trocar. O preço é que a
 * escolha vale por aparelho.
 */
export async function setAparencia(patch: Partial<Aparencia>): Promise<ActionResult> {
  const jar = await cookies()

  const atual = normalizarAparencia({
    tema: jar.get(COOKIES.tema)?.value,
    cor: jar.get(COOKIES.cor)?.value,
    fundo: jar.get(COOKIES.fundo)?.value,
    icone: jar.get(COOKIES.icone)?.value,
    tile: jar.get(COOKIES.tile)?.value,
  })

  const novo = normalizarAparencia({ ...atual, ...patch })

  for (const chave of ['tema', 'cor', 'fundo', 'icone', 'tile'] as const) {
    jar.set(COOKIES[chave], novo[chave], {
      maxAge: UM_ANO,
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // o client aplica na hora, antes da ida ao servidor
    })
  }

  revalidatePath('/', 'layout')
  return ok()
}

export interface PreferenciasAviso {
  notifyEmail: boolean
  notifyTime: string
  notifyDaysBefore: number
}

export async function updateNotificationPrefs(prefs: PreferenciasAviso): Promise<ActionResult> {
  const dias = Number(prefs.notifyDaysBefore)
  if (!Number.isInteger(dias) || dias < 0 || dias > 30) {
    return fail('VALIDATION', 'Confira os campos.', { notifyDaysBefore: 'Entre 0 e 30 dias.' })
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
