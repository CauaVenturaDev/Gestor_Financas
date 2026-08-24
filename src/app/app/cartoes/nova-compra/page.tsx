import type { Metadata } from 'next'
import { BackButton } from '@/components/BackButton'
import { FormNovaCompra } from '@/components/cartoes/FormNovaCompra'
import { listBanks } from '@/server/queries'

export const metadata: Metadata = { title: 'Nova compra' }

export default async function NovaCompraPage() {
  const bancos = await listBanks()

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="space-y-3 pt-safe">
        <BackButton href="/app/cartoes" rotulo="Faturas" />
        <h1 className="text-xl font-semibold">Nova compra</h1>
      </header>

      <FormNovaCompra bancos={bancos} />
    </div>
  )
}
