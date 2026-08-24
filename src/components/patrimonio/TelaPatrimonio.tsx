'use client'

import { useState } from 'react'
import { PiggyBank, Plus, Wallet } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { formatYmShort } from '@/lib/date'
import { EmptyState } from '@/components/ui/EmptyState'
import { TransactionSheet } from '@/components/movimentacoes/TransactionSheet'
import type { CategoryRow, Kind } from '@/lib/database.types'
import type { PatrimonioMes } from '@/server/queries'

/**
 * Card do total atual mais a quebra mês a mês. O acumulado da última linha é,
 * por construção, igual ao card: os dois saem da mesma soma de aportes e resgates.
 */
export function TelaPatrimonio({
  totalCents,
  meses,
  categorias,
}: {
  totalCents: number
  meses: PatrimonioMes[]
  categorias: CategoryRow[]
}) {
  const [abrindo, setAbrindo] = useState<Kind | null>(null)
  const emOrdem = [...meses].reverse()

  return (
    <>
      <div className="card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">
          Patrimônio investido
        </p>
        <p className="tabular mt-1 text-3xl font-semibold text-investimento">
          {formatBRL(totalCents)}
        </p>
        <p className="mt-2 text-sm text-muted">
          Aportes menos resgates. Não considera rendimento — isso está fora do MVP.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setAbrindo('aporte')}
          className="toque gap-2 rounded-xl bg-investimento px-4 font-medium text-white active:opacity-90"
        >
          <Plus size={18} />
          Aportar
        </button>
        <button
          type="button"
          onClick={() => setAbrindo('resgate')}
          className="toque gap-2 rounded-xl border border-line bg-surface px-4 font-medium active:bg-line/40"
        >
          <Wallet size={18} />
          Resgatar
        </button>
      </div>

      {emOrdem.length === 0 ? (
        <EmptyState
          icone={<PiggyBank size={28} />}
          titulo="Nenhum aporte ainda"
          descricao="Registre o primeiro aporte para acompanhar a evolução mês a mês."
        />
      ) : (
        <>
          {/* no celular a tabela vira lista de cartões */}
          <ul className="space-y-2.5 sm:hidden">
            {emOrdem.map((m) => (
              <li key={m.ym} className="card p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium capitalize">{formatYmShort(m.ym)}</span>
                  <span className="tabular font-semibold text-investimento">
                    {formatBRL(m.acumulado)}
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-faint">Aportes</dt>
                    <dd className="tabular mt-0.5 font-medium text-receita">
                      {formatBRL(m.aportes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">Resgates</dt>
                    <dd className="tabular mt-0.5 font-medium text-despesa">
                      {formatBRL(m.resgates)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">Líquido</dt>
                    <dd
                      className={`tabular mt-0.5 font-medium ${
                        m.liquido < 0 ? 'text-despesa' : 'text-ink'
                      }`}
                    >
                      {m.liquido >= 0 ? '+' : ''}
                      {formatBRL(m.liquido)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="card hidden overflow-hidden sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">Mês</th>
                  <th className="px-4 py-3 text-right font-medium">Aportes</th>
                  <th className="px-4 py-3 text-right font-medium">Resgates</th>
                  <th className="px-4 py-3 text-right font-medium">Líquido</th>
                  <th className="px-4 py-3 text-right font-medium">Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {emOrdem.map((m) => (
                  <tr key={m.ym}>
                    <td className="px-4 py-3 font-medium capitalize">{formatYmShort(m.ym)}</td>
                    <td className="tabular px-4 py-3 text-right text-receita">
                      {formatBRL(m.aportes)}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-despesa">
                      {formatBRL(m.resgates)}
                    </td>
                    <td
                      className={`tabular px-4 py-3 text-right ${
                        m.liquido < 0 ? 'text-despesa' : ''
                      }`}
                    >
                      {m.liquido >= 0 ? '+' : ''}
                      {formatBRL(m.liquido)}
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold">
                      {formatBRL(m.acumulado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {abrindo && (
        <TransactionSheet
          aberto
          aoFechar={() => setAbrindo(null)}
          kind={abrindo}
          categorias={categorias}
        />
      )}
    </>
  )
}
