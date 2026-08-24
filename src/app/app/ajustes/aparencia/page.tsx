import type { Metadata } from 'next'
import { TelaAparencia } from '@/components/ajustes/TelaAparencia'
import { aparenciaAtual } from '@/lib/aparencia.server'

export const metadata: Metadata = { title: 'Aparência' }

export default async function AparenciaPage() {
  const inicial = await aparenciaAtual()

  return (
    <>
      <p className="text-sm text-muted">
        Tudo aqui vale só neste aparelho. Em outro celular ou navegador, escolha de novo.
      </p>
      <TelaAparencia inicial={inicial} />
    </>
  )
}
