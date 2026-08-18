import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import type { MonthOverview } from '@/server/queries'

/**
 * A tela de lançamentos ficou com a lista. Dos números, sobra só o par que dá
 * contexto sem competir com ela; o resto mora na aba Relatório.
 */
export function ResumoCompacto({ overview, ym }: { overview: MonthOverview; ym: string }) {
  const { lucro, saldoMes } = overview.realizado

  return (
    <Link
      href={`/app/relatorio?mes=${ym}`}
      className="card flex items-center gap-4 px-3.5 py-3 active:bg-line/20"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">Lucro do mês</p>
        <p className={`tabular mt-0.5 font-semibold ${lucro < 0 ? 'text-despesa' : 'text-ink'}`}>
          {formatBRL(lucro)}
        </p>
      </div>
      <div className="min-w-0 flex-1 border-l border-line pl-4">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">Saldo do mês</p>
        <p className={`tabular mt-0.5 font-semibold ${saldoMes < 0 ? 'text-despesa' : 'text-ink'}`}>
          {formatBRL(saldoMes)}
        </p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-faint" />
    </Link>
  )
}
