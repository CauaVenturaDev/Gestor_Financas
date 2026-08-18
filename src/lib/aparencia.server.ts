import 'server-only'

import { cookies } from 'next/headers'
import { type Aparencia, COOKIES, normalizarAparencia } from '@/lib/aparencia'

/** Aparência escolhida neste aparelho, lida dos cookies no servidor. */
export async function aparenciaAtual(): Promise<Aparencia> {
  const jar = await cookies()
  return normalizarAparencia({
    tema: jar.get(COOKIES.tema)?.value,
    cor: jar.get(COOKIES.cor)?.value,
    fundo: jar.get(COOKIES.fundo)?.value,
    icone: jar.get(COOKIES.icone)?.value,
    tile: jar.get(COOKIES.tile)?.value,
  })
}
