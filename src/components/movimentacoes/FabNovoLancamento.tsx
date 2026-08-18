'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet } from 'lucide-react'
import { Fab } from '@/components/ui/Fab'
import { Sheet } from '@/components/ui/Sheet'
import { TransactionSheet } from '@/components/movimentacoes/TransactionSheet'
import type { CategoryRow, Kind } from '@/lib/database.types'

const OPCOES: { kind: Kind; rotulo: string; descricao: string; Icone: typeof Wallet; cor: string }[] = [
  { kind: 'receita', rotulo: 'Receita', descricao: 'Dinheiro que entrou', Icone: ArrowUpRight, cor: 'text-receita' },
  { kind: 'despesa', rotulo: 'Despesa', descricao: 'Dinheiro que saiu', Icone: ArrowDownLeft, cor: 'text-despesa' },
  { kind: 'aporte', rotulo: 'Aporte', descricao: 'Guardar em investimento', Icone: PiggyBank, cor: 'text-investimento' },
  { kind: 'resgate', rotulo: 'Resgate', descricao: 'Tirar do investimento', Icone: Wallet, cor: 'text-investimento' },
]

/**
 * O FAB é o atalho para lançar de qualquer ponto da tela, sem rolar até a
 * seção. A escolha do tipo acontece aqui, e não dentro do formulário: o
 * formulário continua sem campo de tipo.
 */
export function FabNovoLancamento({ categorias }: { categorias: CategoryRow[] }) {
  const [escolhendo, setEscolhendo] = useState(false)
  const [kind, setKind] = useState<Kind | null>(null)

  const natureza = (k: Kind) => (k === 'receita' || k === 'despesa' ? k : 'investimento')

  return (
    <>
      <Fab rotulo="Novo" onClick={() => setEscolhendo(true)} />

      <Sheet
        aberto={escolhendo}
        aoFechar={() => setEscolhendo(false)}
        titulo="O que você quer lançar?"
      >
        <div className="space-y-1.5 pb-2">
          {OPCOES.map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => { setEscolhendo(false); setKind(o.kind) }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-line/50"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-line/50 ${o.cor}`}>
                <o.Icone size={19} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{o.rotulo}</span>
                <span className="block text-sm text-muted">{o.descricao}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>

      {kind && (
        <TransactionSheet
          aberto
          aoFechar={() => setKind(null)}
          kind={kind}
          categorias={categorias.filter((c) => c.nature === natureza(kind) && !c.is_archived)}
        />
      )}
    </>
  )
}
