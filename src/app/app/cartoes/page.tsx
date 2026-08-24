import type { Metadata } from 'next'
import { aparenciaAtual } from '@/lib/aparencia.server'
import { MonthNav } from '@/components/MonthNav'
import { SubNav } from '@/components/SubNav'
import { MenuSistema } from '@/components/MenuSistema'
import { AtalhosCartoes, TelaFaturas } from '@/components/cartoes/TelaFaturas'
import { FabLink } from '@/components/ui/Fab'
import { listBanks, listInvoice, normalizeYm } from '@/server/queries'
import { SUBNAV_CARTOES } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Faturas de cartão' }

export default async function CartoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; banco?: string; status?: string; q?: string }>
}) {
  const sp = await searchParams
  const ym = normalizeYm(sp.mes)

  const aparencia = await aparenciaAtual()

  const [fatura, bancos] = await Promise.all([
    listInvoice({ ym, bankId: sp.banco, status: sp.status, q: sp.q }),
    listBanks(),
  ])

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="sticky top-0 z-30 -mx-4 space-y-3 bg-bg/85 px-4 pb-3 pt-safe vidro sm:top-16">
        <MonthNav ym={ym} />
        <SubNav itens={SUBNAV_CARTOES} acao={<MenuSistema aparencia={aparencia} />} />
      </header>

      <AtalhosCartoes />

      <TelaFaturas
        totalCents={fatura.totalCents}
        paidCents={fatura.paidCents}
        items={fatura.items}
        bancos={bancos}
        bankId={sp.banco}
      />

      <FabLink href="/app/cartoes/nova-compra" rotulo="Nova compra" />
    </div>
  )
}
