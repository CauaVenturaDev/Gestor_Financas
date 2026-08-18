'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { ListaLancamentos } from '@/components/movimentacoes/ListaLancamentos'
import { TransactionSheet } from '@/components/movimentacoes/TransactionSheet'
import type { CategoryRow, Kind } from '@/lib/database.types'
import type { TxItem } from '@/server/queries'

interface Props {
  titulo: string
  total: number
  itens: TxItem[]
  categorias: CategoryRow[]
  /** Investimentos tem dois botões: Aportar e Resgatar. */
  acoes: { kind: Kind; rotulo: string }[]
  vazio: string
  cor: string
}

/** A seção define o kind do lançamento. O formulário não tem campo de tipo. */
export function SecaoLancamentos({
  titulo, total, itens, categorias, acoes, vazio, cor,
}: Props) {
  const [abrindo, setAbrindo] = useState<Kind | null>(null)

  return (
    <section className="space-y-2.5">
      <header className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">{titulo}</h2>
        <span className={`tabular text-sm font-medium ${cor}`}>{formatBRL(total)}</span>
        <div className="ml-auto flex gap-1.5">
          {acoes.map((a) => (
            <button
              key={a.kind + a.rotulo}
              type="button"
              onClick={() => setAbrindo(a.kind)}
              className="toque gap-1 rounded-full border border-line bg-surface px-3 text-sm
                         font-medium text-muted active:bg-line/40"
            >
              <Plus size={15} />
              {a.rotulo}
            </button>
          ))}
        </div>
      </header>

      <ListaLancamentos
        itens={itens}
        kind={acoes[0].kind}
        categorias={categorias}
        vazio={vazio}
      />

      {abrindo && (
        <TransactionSheet
          aberto
          aoFechar={() => setAbrindo(null)}
          kind={abrindo}
          categorias={categorias}
        />
      )}
    </section>
  )
}
