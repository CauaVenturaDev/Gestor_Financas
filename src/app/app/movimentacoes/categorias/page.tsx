import type { Metadata } from 'next'
import { SubNav } from '@/components/SubNav'
import { BackButton } from '@/components/BackButton'
import { GerenciarCategorias } from '@/components/categorias/GerenciarCategorias'
import { countTransactionsByCategory, listCategories } from '@/server/queries'
import { SUBNAV_MOVIMENTACOES } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Categorias' }

export default async function CategoriasPage() {
  const [categorias, contagens] = await Promise.all([
    listCategories({ includeArchived: true }),
    countTransactionsByCategory(),
  ])

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="space-y-3 pt-safe">
        <BackButton href="/app/movimentacoes" rotulo="Movimentações" />
        <h1 className="text-xl font-semibold">Categorias</h1>
        <SubNav itens={SUBNAV_MOVIMENTACOES} />
      </header>

      <GerenciarCategorias categorias={categorias} contagens={Object.fromEntries(contagens)} />
    </div>
  )
}
