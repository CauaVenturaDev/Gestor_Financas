import type { Metadata } from 'next'
import { SubNav } from '@/components/SubNav'
import { BackButton } from '@/components/BackButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatBRL } from '@/lib/money'
import { formatYmShort } from '@/lib/date'
import { getProjection, listBanks } from '@/server/queries'
import { SUBNAV_CARTOES } from '@/app/app/movimentacoes/subnav'

export const metadata: Metadata = { title: 'Projeção' }

export default async function ProjecaoPage() {
  const [meses, bancos] = await Promise.all([getProjection(12), listBanks(true)])
  const total = meses.reduce((s, m) => s + m.totalCents, 0)
  const usados = bancos.filter((b) =>
    meses.some((m) => m.porBanco.some((p) => p.bankId === b.id && p.totalCents > 0)),
  )

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="space-y-3 pt-safe">
        <BackButton href="/app/cartoes" rotulo="Faturas" />
        <div>
          <h1 className="text-xl font-semibold">Projeção</h1>
          <p className="mt-1 text-sm text-muted">
            Próximos 12 meses. Cada mês soma apenas as parcelas ainda não pagas.
          </p>
        </div>
        <SubNav itens={SUBNAV_CARTOES} />
      </header>

      <div className="card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">
          Comprometido futuro
        </p>
        <p className="tabular mt-1 text-3xl font-semibold">{formatBRL(total)}</p>
      </div>

      {total === 0 ? (
        <EmptyState
          titulo="Nada comprometido à frente"
          descricao="Não há parcelas em aberto nos próximos 12 meses."
        />
      ) : (
        <>
          {/* celular: lista de cartões, sem rolagem horizontal */}
          <ul className="space-y-2.5 sm:hidden">
            {meses.map((m) => (
              <li key={m.ym} className="card p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium capitalize">{formatYmShort(m.ym)}</span>
                  <span className="tabular font-semibold">{formatBRL(m.totalCents)}</span>
                </div>
                {m.porBanco.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
                    {m.porBanco.map((b) => (
                      <li key={b.bankId} className="flex justify-between text-muted">
                        <span className="truncate">{b.bankName}</span>
                        <span className="tabular">{formatBRL(b.totalCents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/*
            Desktop: a tabela por banco é indispensável, então vira rolagem
            horizontal com a primeira coluna fixa.
          */}
          <div className="card hidden overflow-hidden sm:block">
            <div className="rolagem overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                  <tr>
                    <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium">Mês</th>
                    {usados.map((b) => (
                      <th key={b.id} className="px-4 py-3 text-right font-medium">
                        {b.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {meses.map((m) => (
                    <tr key={m.ym}>
                      <td className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium capitalize">
                        {formatYmShort(m.ym)}
                      </td>
                      {usados.map((b) => {
                        const v = m.porBanco.find((p) => p.bankId === b.id)?.totalCents ?? 0
                        return (
                          <td
                            key={b.id}
                            className={`tabular px-4 py-3 text-right ${v ? '' : 'text-faint'}`}
                          >
                            {v ? formatBRL(v) : '—'}
                          </td>
                        )
                      })}
                      <td className="tabular px-4 py-3 text-right font-semibold">
                        {formatBRL(m.totalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
