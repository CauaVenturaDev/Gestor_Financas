import type { Metadata } from 'next'
import { SubNav } from '@/components/SubNav'
import { BackButton } from '@/components/BackButton'
import { TelaPatrimonio } from '@/components/patrimonio/TelaPatrimonio'
import { getPatrimonio, listCategories } from '@/server/queries'
import { SUBNAV_RELATORIO } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Patrimônio' }

export default async function PatrimonioPage() {
  const [patrimonio, categorias] = await Promise.all([
    getPatrimonio(),
    listCategories({ nature: 'investimento' }),
  ])

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="space-y-3 pt-safe">
        <BackButton href="/app/relatorio" rotulo="Relatório" />
        <h1 className="text-xl font-semibold">Patrimônio</h1>
        <SubNav itens={SUBNAV_RELATORIO} />
      </header>

      <TelaPatrimonio
        totalCents={patrimonio.totalCents}
        meses={patrimonio.meses}
        categorias={categorias}
      />
    </div>
  )
}
