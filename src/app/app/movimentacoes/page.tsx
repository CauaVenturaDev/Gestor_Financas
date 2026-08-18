import type { Metadata } from 'next'
import { MonthNav } from '@/components/MonthNav'
import { SubNav } from '@/components/SubNav'
import { ResumoCompacto } from '@/components/movimentacoes/ResumoCompacto'
import { SecaoLancamentos } from '@/components/movimentacoes/SecaoLancamentos'
import { Filtros } from '@/components/movimentacoes/Filtros'
import { FabNovoLancamento } from '@/components/movimentacoes/FabNovoLancamento'
import { getMonthOverview, listCategories, listTransactions, normalizeYm } from '@/server/queries'
import { SUBNAV_MOVIMENTACOES } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Lançamentos' }

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; cat?: string; q?: string }>
}) {
  const sp = await searchParams
  const ym = normalizeYm(sp.mes)
  const categoryIds = sp.cat?.split(',').filter(Boolean)

  const [overview, itens, categorias] = await Promise.all([
    getMonthOverview(ym),
    listTransactions({ ym, categoryIds, q: sp.q }),
    listCategories({ includeArchived: true }),
  ])

  const ativas = categorias.filter((c) => !c.is_archived)
  const por = (...kinds: string[]) => itens.filter((t) => kinds.includes(t.kind))

  return (
    <div className="space-y-4 px-4 pt-3">
      {/* cabeçalho grudado no topo: o contexto do mês nunca some ao rolar */}
      <header className="sticky top-0 z-30 -mx-4 space-y-3 bg-bg/85 px-4 pb-3 pt-safe vidro sm:top-16">
        <MonthNav ym={ym} />
        <SubNav itens={SUBNAV_MOVIMENTACOES} />
      </header>

      <ResumoCompacto overview={overview} ym={ym} />

      <Filtros categorias={categorias} />

      <div className="space-y-6 pb-4">
        <SecaoLancamentos
          titulo="Receitas"
          total={overview.realizado.receitas}
          itens={por('receita')}
          categorias={ativas.filter((c) => c.nature === 'receita')}
          acoes={[{ kind: 'receita', rotulo: 'Nova' }]}
          vazio="Nenhuma receita neste mês"
          cor="text-receita"
        />

        <SecaoLancamentos
          titulo="Despesas"
          total={overview.realizado.despesas}
          itens={por('despesa')}
          categorias={ativas.filter((c) => c.nature === 'despesa')}
          acoes={[{ kind: 'despesa', rotulo: 'Nova' }]}
          vazio="Nenhuma despesa neste mês"
          cor="text-despesa"
        />

        <SecaoLancamentos
          titulo="Investimentos"
          total={overview.realizado.aportes}
          itens={por('aporte', 'resgate')}
          categorias={ativas.filter((c) => c.nature === 'investimento')}
          acoes={[
            { kind: 'aporte', rotulo: 'Aportar' },
            { kind: 'resgate', rotulo: 'Resgatar' },
          ]}
          vazio="Nenhum aporte ou resgate neste mês"
          cor="text-investimento"
        />
      </div>

      <FabNovoLancamento categorias={ativas} />
    </div>
  )
}
