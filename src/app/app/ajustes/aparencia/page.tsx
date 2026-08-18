import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { SeletorTema } from '@/components/ajustes/SeletorTema'
import { COOKIE_TEMA, TEMA_PADRAO, ehTemaValido } from '@/lib/theme'

export const metadata: Metadata = { title: 'Aparência' }

export default async function AparenciaPage() {
  const cookie = (await cookies()).get(COOKIE_TEMA)?.value
  const atual = ehTemaValido(cookie) ? cookie : TEMA_PADRAO

  return (
    <>
      <p className="text-sm text-muted">
        O tema vale só neste aparelho. Em outro celular ou navegador, escolha de novo.
      </p>
      <SeletorTema atual={atual} />
    </>
  )
}
