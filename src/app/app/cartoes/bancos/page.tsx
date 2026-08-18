import type { Metadata } from 'next'
import { SubNav } from '@/components/SubNav'
import { BackButton } from '@/components/BackButton'
import { GerenciarBancos } from '@/components/cartoes/GerenciarBancos'
import { listBanks, openInstallmentsByBank } from '@/server/queries'
import { SUBNAV_CARTOES } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Bancos' }

export default async function BancosPage() {
  const [bancos, emAberto] = await Promise.all([listBanks(true), openInstallmentsByBank()])

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="space-y-3 pt-safe">
        <BackButton href="/app/cartoes" rotulo="Faturas" />
        <h1 className="text-xl font-semibold">Bancos e cartões</h1>
        <SubNav itens={SUBNAV_CARTOES} />
      </header>

      <GerenciarBancos bancos={bancos} emAberto={Object.fromEntries(emAberto)} />
    </div>
  )
}
