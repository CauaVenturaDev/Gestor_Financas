import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BackButton } from '@/components/BackButton'
import { DetalheCompra } from '@/components/cartoes/DetalheCompra'
import { getPurchase } from '@/server/queries'

export const metadata: Metadata = { title: 'Compra' }

export default async function CompraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dados = await getPurchase(id)
  if (!dados) notFound()

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="pt-safe">
        <BackButton href="/app/cartoes" rotulo="Faturas" />
      </header>

      <DetalheCompra purchase={dados.purchase} installments={dados.installments} />
    </div>
  )
}
