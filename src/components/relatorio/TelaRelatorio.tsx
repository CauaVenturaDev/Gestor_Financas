'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { Sheet } from '@/components/ui/Sheet'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Breakdown, MonthOverview } from '@/server/queries'
import type { Kind } from '@/lib/database.types'

interface Props {
  overview: MonthOverview
  realizado: Breakdown
  projetado: Breakdown
}

const SECOES: { kinds: Kind[]; titulo: string; cor: string; barra: string }[] = [
  { kinds: ['despesa'], titulo: 'Despesas por categoria', cor: 'text-despesa', barra: 'bg-despesa' },
  { kinds: ['receita'], titulo: 'Receitas por categoria', cor: 'text-receita', barra: 'bg-receita' },
  {
    kinds: ['aporte', 'resgate'],
    titulo: 'Investimentos por categoria',
    cor: 'text-investimento',
    barra: 'bg-investimento',
  },
]

/**
 * O relatório vive em aba própria: a tela de lançamentos ficou com a lista, e
 * aqui os números têm espaço para a quebra por categoria e o próprio recorte.
 */
export function TelaRelatorio({ overview, realizado, projetado }: Props) {
  const [visao, setVisao] = useState<'realizado' | 'projetado'>('realizado')
  const [ajuda, setAjuda] = useState(false)

  const t = overview[visao]
  const quebra = visao === 'realizado' ? realizado : projetado
  const temResgate = t.resgates > 0

  return (
    <>
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
        <Card
          rotulo="Aportes do mês"
          valor={t.aportes}
          cor="text-investimento"
          rodape={temResgate ? `− ${formatBRL(t.resgates)} resgatado` : undefined}
        />
        <Card rotulo="Lucro do mês" valor={t.lucro} destaque />
      </div>

      <dl className="card divide-y divide-line text-sm">
        <Linha rotulo="Resgates" valor={t.resgates} />
        <Linha rotulo="Saldo do mês" valor={t.saldoMes} />
        <Linha rotulo="Saldo acumulado" valor={t.saldoAcumulado} />
        <Linha rotulo="Patrimônio investido" valor={overview.patrimonio} />
        <Linha rotulo="Comprometido no cartão" valor={overview.comprometidoCartao} informativo />
      </dl>

      {SECOES.map((s) => {
        const itens = s.kinds.flatMap((k) => quebra[k] ?? [])
        const agrupado = new Map<string, number>()
        for (const i of itens) agrupado.set(i.nome, (agrupado.get(i.nome) ?? 0) + i.totalCents)
        const linhas = [...agrupado].map(([nome, total]) => ({ nome, total }))
          .sort((a, b) => b.total - a.total)
        const soma = linhas.reduce((acc, l) => acc + l.total, 0)

        return (
          <section key={s.titulo} className="space-y-2.5">
            <header className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-semibold">{s.titulo}</h2>
              <span className={`tabular ml-auto text-sm font-medium ${s.cor}`}>
                {formatBRL(soma)}
              </span>
            </header>

            {linhas.length === 0 ? (
              <EmptyState titulo="Nada neste mês" />
            ) : (
              <ul className="card divide-y divide-line overflow-hidden">
                {linhas.map((l) => (
                  <li key={l.nome} className="px-3.5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium">{l.nome}</span>
                      <span className="tabular shrink-0 text-sm">
                        <span className="text-faint">
                          {soma > 0 ? Math.round((l.total / soma) * 100) : 0}%
                        </span>{' '}
                        <span className="font-semibold">{formatBRL(l.total)}</span>
                      </span>
                    </div>
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70"
                      role="presentation"
                    >
                      <div
                        className={`h-full rounded-full ${s.barra}`}
                        style={{ width: `${soma > 0 ? (l.total / soma) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      <Sheet aberto={ajuda} aoFechar={() => setAjuda(false)} titulo="Como a conta é feita">
        <div className="space-y-4 pb-2 text-sm leading-relaxed text-muted">
          <p>
            <strong className="text-ink">Lucro do mês</strong> = receitas − despesas − aportes.
            O aporte tira dinheiro do caixa e vira patrimônio, então ele desconta do lucro.
            Investimento nunca soma com despesa.
          </p>
          <p>
            <strong className="text-ink">Resgate não entra no lucro.</strong> Tirar dinheiro do
            próprio investimento não é ganho: você só mudou o dinheiro de lugar. Num mês em que
            você resgata R$ 5.000 e gasta os mesmos R$ 5.000 numa viagem, o lucro fica em
            −R$ 5.000, que é a verdade — você consumiu cinco mil da sua reserva. O{' '}
            <strong className="text-ink">saldo do mês</strong> conta a outra metade: fica em
            zero, porque a carteira não mexeu.
          </p>
          <p>
            <strong className="text-ink">Aportes do mês</strong> é quanto você guardou, bruto.
            Quanto está guardado é o <strong className="text-ink">patrimônio investido</strong>,
            que já desconta os resgates.
          </p>
          <p>
            <strong className="text-ink">Saldo acumulado</strong> soma tudo que já aconteceu até
            o fim deste mês. O saldo inicial do mês seguinte é este mesmo número.
          </p>
          <p>
            <strong className="text-ink">Realizado</strong> conta só o que já se efetivou.{' '}
            <strong className="text-ink">Projetado</strong> inclui os lançamentos previstos do mês.
          </p>
          <p>
            <strong className="text-ink">Comprometido no cartão</strong> é informativo: são as
            parcelas que vencem neste mês, e elas não entram em nenhum total desta tela.
          </p>
        </div>
      </Sheet>
    </>
  )
}

function Card({
  rotulo, valor, cor, destaque, rodape,
}: {
  rotulo: string
  valor: number
  cor?: string
  destaque?: boolean
  rodape?: string
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
      {rodape && <p className="tabular mt-0.5 text-xs text-faint">{rodape}</p>}
    </div>
  )
}

function Linha({
  rotulo, valor, informativo,
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
