'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import type { MonthOverview } from '@/server/queries'
import { Sheet } from '@/components/ui/Sheet'

/**
 * Cards do mês. O alternador Realizado | Projetado é a RN09: relatório em tempo
 * real não pode contar dinheiro que ainda não se moveu, mas o usuário precisa
 * enxergar o que vem.
 */
export function ResumoMes({ overview }: { overview: MonthOverview }) {
  const [visao, setVisao] = useState<'realizado' | 'projetado'>('realizado')
  const [ajuda, setAjuda] = useState(false)
  const t = overview[visao]

  return (
    <section aria-label="Resumo do mês" className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Visão dos totais"
          className="flex rounded-full border border-line bg-surface p-0.5 text-sm"
        >
          {(['realizado', 'projetado'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={visao === v}
              onClick={() => setVisao(v)}
              className={`rounded-full px-3.5 py-1.5 font-medium capitalize transition-colors ${
                visao === v ? 'bg-ink text-bg' : 'text-muted'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAjuda(true)}
          aria-label="Como os números são calculados"
          className="toque -mr-2 ml-auto rounded-full text-faint active:bg-line/40"
        >
          <Info size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Card rotulo="Receitas" valor={t.receitas} cor="text-receita" />
        <Card rotulo="Despesas" valor={t.despesas} cor="text-despesa" />
        <Card rotulo="Investido" valor={t.aportes} cor="text-investimento" />
        <Card rotulo="Lucro do mês" valor={t.lucro} destaque />
      </div>

      <dl className="card divide-y divide-line text-sm">
        <Linha rotulo="Resgates" valor={t.resgates} />
        <Linha rotulo="Saldo do mês" valor={t.saldoMes} />
        <Linha rotulo="Saldo acumulado" valor={t.saldoAcumulado} />
        <Linha rotulo="Patrimônio investido" valor={overview.patrimonio} />
        <Linha
          rotulo="Comprometido no cartão"
          valor={overview.comprometidoCartao}
          informativo
        />
      </dl>

      <Sheet aberto={ajuda} aoFechar={() => setAjuda(false)} titulo="Como a conta é feita">
        <div className="space-y-4 pb-2 text-sm leading-relaxed text-muted">
          <p>
            <strong className="text-ink">Lucro do mês</strong> = receitas − despesas − investido.
            O aporte tira dinheiro do caixa e vira patrimônio, então ele desconta do lucro.
            Investimento nunca soma com despesa.
          </p>
          <p>
            <strong className="text-ink">Saldo do mês</strong> = lucro + resgates. É o que de fato
            entrou ou saiu da conta. O resgate não é receita: ele volta como saldo disponível sem
            inflar o total de receitas.
          </p>
          <p>
            <strong className="text-ink">Saldo acumulado</strong> soma tudo que já aconteceu até o
            fim deste mês. O saldo inicial do mês seguinte é este mesmo número.
          </p>
          <p>
            <strong className="text-ink">Patrimônio investido</strong> = aportes − resgates
            acumulados. Não considera rendimento.
          </p>
          <p>
            <strong className="text-ink">Realizado</strong> conta só o que já se efetivou.{' '}
            <strong className="text-ink">Projetado</strong> inclui os lançamentos previstos do mês.
          </p>
          <p>
            <strong className="text-ink">Comprometido no cartão</strong> é informativo: são as
            parcelas que vencem neste mês e elas não entram em nenhum total desta aba.
          </p>
        </div>
      </Sheet>
    </section>
  )
}

function Card({
  rotulo,
  valor,
  cor,
  destaque,
}: {
  rotulo: string
  valor: number
  cor?: string
  destaque?: boolean
}) {
  return (
    <div className={`card p-3.5 ${destaque ? 'col-span-2 lg:col-span-1' : ''}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-faint">{rotulo}</dt>
      <dd
        className={`tabular mt-1 font-semibold ${destaque ? 'text-xl' : 'text-lg'} ${
          cor ?? (valor < 0 ? 'text-despesa' : 'text-ink')
        }`}
      >
        {formatBRL(valor)}
      </dd>
    </div>
  )
}

function Linha({
  rotulo,
  valor,
  informativo,
}: {
  rotulo: string
  valor: number
  informativo?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <dt className={informativo ? 'text-faint' : 'text-muted'}>
        {rotulo}
        {informativo && <span className="ml-1.5 text-xs">(fora dos totais)</span>}
      </dt>
      <dd
        className={`tabular font-medium ${
          informativo ? 'text-faint' : valor < 0 ? 'text-despesa' : 'text-ink'
        }`}
      >
        {formatBRL(valor)}
      </dd>
    </div>
  )
}
