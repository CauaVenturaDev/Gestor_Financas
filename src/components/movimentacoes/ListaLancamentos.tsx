'use client'

import { useState, useTransition } from 'react'
import {
  ArrowDownLeft, ArrowUpRight, Copy, MoreVertical, PiggyBank,
  Pencil, Repeat, Trash2, Wallet,
} from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { formatDayMonth } from '@/lib/date'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Field } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { TransactionSheet } from '@/components/movimentacoes/TransactionSheet'
import {
  confirmOccurrence, deleteTransaction, duplicateTransaction,
} from '@/server/actions/transactions'
import type { CategoryRow, Kind } from '@/lib/database.types'
import type { TxItem } from '@/server/queries'

const ESTILO: Record<Kind, { cor: string; Icone: typeof Wallet; sinal: string }> = {
  receita: { cor: 'text-receita', Icone: ArrowUpRight, sinal: '+' },
  despesa: { cor: 'text-despesa', Icone: ArrowDownLeft, sinal: '−' },
  aporte: { cor: 'text-investimento', Icone: PiggyBank, sinal: '−' },
  resgate: { cor: 'text-investimento', Icone: Wallet, sinal: '+' },
}

interface Props {
  itens: TxItem[]
  kind: Kind
  categorias: CategoryRow[]
  vazio: string
}

/**
 * Abaixo de `sm` a tabela vira lista de cartões, com rótulo e valor em duas
 * colunas — nada de rolagem horizontal no celular.
 */
export function ListaLancamentos({ itens, kind, categorias, vazio }: Props) {
  const [menu, setMenu] = useState<TxItem | null>(null)
  const [editando, setEditando] = useState<TxItem | null>(null)
  const [excluindo, setExcluindo] = useState<TxItem | null>(null)
  const [confirmando, setConfirmando] = useState<TxItem | null>(null)

  if (itens.length === 0) {
    return <EmptyState titulo={vazio} descricao="Toque no botão para lançar o primeiro." />
  }

  return (
    <>
      <ul className="card divide-y divide-line overflow-hidden">
        {itens.map((t) => {
          const { cor, Icone, sinal } = ESTILO[t.kind]
          const previsto = t.status === 'previsto'
          const semValor = t.amount_cents === null

          return (
            <li key={t.id} className="flex items-center gap-3 px-3.5 py-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-line/50 ${cor}`}>
                <Icone size={17} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-tight">{t.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
                  <span className="tabular">{formatDayMonth(t.date)}</span>
                  {t.categoryName && <span className="truncate">{t.categoryName}</span>}
                  {t.recurrence_id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-line/60 px-1.5 py-0.5">
                      <Repeat size={11} />
                      recorrente
                    </span>
                  )}
                  {previsto && (
                    <span className="rounded-full bg-alerta/15 px-1.5 py-0.5 text-alerta">
                      previsto
                    </span>
                  )}
                </p>
              </div>

              <div className="shrink-0 text-right">
                {semValor ? (
                  <button
                    type="button"
                    onClick={() => setConfirmando(t)}
                    className="rounded-lg bg-alerta/15 px-2.5 py-1.5 text-xs font-semibold text-alerta"
                  >
                    Confirmar valor
                  </button>
                ) : (
                  <p className={`tabular font-semibold ${previsto ? 'text-faint' : cor}`}>
                    {sinal} {formatBRL(t.amount_cents)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMenu(t)}
                aria-label={`Ações de ${t.name}`}
                className="toque -mr-2 shrink-0 rounded-full text-faint active:bg-line/50"
              >
                <MoreVertical size={18} />
              </button>
            </li>
          )
        })}
      </ul>

      <MenuAcoes
        item={menu}
        aoFechar={() => setMenu(null)}
        aoEditar={(t) => { setMenu(null); setEditando(t) }}
        aoExcluir={(t) => { setMenu(null); setExcluindo(t) }}
      />

      <TransactionSheet
        aberto={Boolean(editando)}
        aoFechar={() => setEditando(null)}
        kind={kind}
        categorias={categorias}
        transacao={editando}
      />

      <ConfirmarExclusao item={excluindo} aoFechar={() => setExcluindo(null)} />
      <ConfirmarValor item={confirmando} aoFechar={() => setConfirmando(null)} />
    </>
  )
}

function MenuAcoes({
  item, aoFechar, aoEditar, aoExcluir,
}: {
  item: TxItem | null
  aoFechar: () => void
  aoEditar: (t: TxItem) => void
  aoExcluir: (t: TxItem) => void
}) {
  const toast = useToast()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet aberto={Boolean(item)} aoFechar={aoFechar} titulo={item?.name ?? ''}>
      <div className="space-y-1.5 pb-2">
        <BotaoMenu Icone={Pencil} onClick={() => item && aoEditar(item)}>
          Editar
        </BotaoMenu>
        <BotaoMenu
          Icone={Copy}
          disabled={ocupado}
          onClick={() =>
            iniciar(async () => {
              if (!item) return
              const res = await duplicateTransaction(item.id)
              toast[res.ok ? 'sucesso' : 'erro'](
                res.ok ? 'Lançamento duplicado.' : res.message,
              )
              aoFechar()
            })
          }
        >
          Duplicar
        </BotaoMenu>
        <BotaoMenu Icone={Trash2} perigo onClick={() => item && aoExcluir(item)}>
          Excluir
        </BotaoMenu>
      </div>
    </Sheet>
  )
}

function BotaoMenu({
  Icone, children, perigo, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  Icone: typeof Pencil
  perigo?: boolean
}) {
  return (
    <button
      type="button"
      {...props}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium
        active:bg-line/50 disabled:opacity-50 ${perigo ? 'text-despesa' : ''}`}
    >
      <Icone size={19} />
      {children}
    </button>
  )
}

function ConfirmarExclusao({ item, aoFechar }: { item: TxItem | null; aoFechar: () => void }) {
  const toast = useToast()
  const [ocupado, iniciar] = useTransition()
  const recorrente = Boolean(item?.recurrence_id)

  return (
    <Sheet
      aberto={Boolean(item)}
      aoFechar={aoFechar}
      titulo="Excluir lançamento?"
      descricao={
        recorrente
          ? 'Só esta ocorrência sai do mês. A regra continua gerando os outros meses, e este mês não volta.'
          : 'O lançamento some das listas e dos totais. O histórico fica registrado na auditoria.'
      }
      rodape={
        <div className="flex gap-2">
          <Button variante="secundario" bloco onClick={aoFechar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button
            variante="perigo"
            bloco
            carregando={ocupado}
            onClick={() =>
              iniciar(async () => {
                if (!item) return
                const res = await deleteTransaction(item.id)
                toast[res.ok ? 'sucesso' : 'erro'](res.ok ? 'Lançamento excluído.' : res.message)
                aoFechar()
              })
            }
          >
            Excluir
          </Button>
        </div>
      }
    >
      <div className="pb-1" />
    </Sheet>
  )
}

function ConfirmarValor({ item, aoFechar }: { item: TxItem | null; aoFechar: () => void }) {
  const toast = useToast()
  const [valor, setValor] = useState<number | null>(null)
  const [erro, setErro] = useState<string | undefined>()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={Boolean(item)}
      aoFechar={() => { setValor(null); setErro(undefined); aoFechar() }}
      titulo="Confirmar valor"
      descricao={`${item?.name ?? ''} — só entra nos totais depois de confirmado.`}
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              if (!item) return
              const res = await confirmOccurrence({ id: item.id, amountCents: valor })
              if (!res.ok) {
                setErro(res.fieldErrors?.amountCents ?? res.message)
                return
              }
              toast.sucesso('Valor confirmado.')
              setValor(null)
              aoFechar()
            })
          }
        >
          Confirmar
        </Button>
      }
    >
      <div className="pb-2">
        <Field label="Valor deste mês" htmlFor="conf-valor" erro={erro}>
          <MoneyInput id="conf-valor" value={valor} onChange={setValor} />
        </Field>
      </div>
    </Sheet>
  )
}
