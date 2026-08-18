import type { Metadata } from 'next'
import { temaAtual } from '@/lib/theme.server'
import { MonthNav } from '@/components/MonthNav'
import { SubNav } from '@/components/SubNav'
import { MenuSistema } from '@/components/MenuSistema'
import { TelaRelatorio } from '@/components/relatorio/TelaRelatorio'
import { getCategoryBreakdown, getMonthOverview, normalizeYm } from '@/server/queries'
import { SUBNAV_RELATORIO } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Relatório' }

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const sp = await searchParams
  const ym = normalizeYm(sp.mes)

  const tema = await temaAtual()

  const [overview, realizado, projetado] = await Promise.all([
    getMonthOverview(ym),
    getCategoryBreakdown(ym, false),
    getCategoryBreakdown(ym, true),
  ])

  return (
    <div className="space-y-5 px-4 pt-3">
      <header className="sticky top-0 z-30 -mx-4 space-y-3 bg-bg/85 px-4 pb-3 pt-safe vidro sm:top-16">
        <MonthNav ym={ym} />
        <SubNav itens={SUBNAV_RELATORIO} acao={<MenuSistema tema={tema} />} />
      </header>

      <TelaRelatorio overview={overview} realizado={realizado} projetado={projetado} />
    </div>
  )
}
