import type { Metadata } from 'next'
import { SubNav } from '@/components/SubNav'
import { BackButton } from '@/components/BackButton'
import { GerenciarRecorrentes } from '@/components/recorrentes/GerenciarRecorrentes'
import { listCategories, listRecurrences } from '@/server/queries'
import { SUBNAV_MOVIMENTACOES } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Recorrentes' }

export default async function RecorrentesPage() {
  const [regras, categorias] = await Promise.all([listRecurrences(), listCategories()])

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="space-y-3 pt-safe">
        <BackButton href="/app/movimentacoes" rotulo="Movimentações" />
        <div>
          <h1 className="text-xl font-semibold">Recorrentes</h1>
          <p className="mt-1 text-sm text-muted">
            As ocorrências entram sozinhas todo mês e se efetivam quando a data chega.
          </p>
        </div>
        <SubNav itens={SUBNAV_MOVIMENTACOES} />
      </header>

      <GerenciarRecorrentes regras={regras} categorias={categorias} />
    </div>
  )
}
