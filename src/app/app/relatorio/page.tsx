import type { Metadata } from 'next'
import { aparenciaAtual } from '@/lib/aparencia.server'
import { MonthNav } from '@/components/MonthNav'
import { SubNav } from '@/components/SubNav'
import { MenuSistema } from '@/components/MenuSistema'
import { TelaRelatorio } from '@/components/relatorio/TelaRelatorio'
import { getVisaoDoMes, normalizeYm } from '@/server/queries'
import { SUBNAV_RELATORIO } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Relatório' }

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const sp = await searchParams
  const ym = normalizeYm(sp.mes)

  const aparencia = await aparenciaAtual()

  const visao = await getVisaoDoMes(ym, true)

  return (
    <div className="space-y-5 px-4 pt-3">
      <header className="sticky top-0 z-30 -mx-4 space-y-3 bg-bg/85 px-4 pb-3 pt-safe vidro sm:top-16">
        <MonthNav ym={ym} />
        <SubNav itens={SUBNAV_RELATORIO} acao={<MenuSistema aparencia={aparencia} />} />
      </header>

      <TelaRelatorio
        overview={visao}
        realizado={visao.quebraRealizado ?? {}}
        projetado={visao.quebraProjetado ?? {}}
      />
    </div>
  )
}
