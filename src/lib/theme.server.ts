import 'server-only'

import { cookies } from 'next/headers'
import { COOKIE_TEMA, TEMA_PADRAO, type TemaId, ehTemaValido } from '@/lib/theme'

/** Tema escolhido neste aparelho, lido do cookie no servidor. */
export async function temaAtual(): Promise<TemaId> {
  const cookie = (await cookies()).get(COOKIE_TEMA)?.value
  return ehTemaValido(cookie) ? cookie : TEMA_PADRAO
}
