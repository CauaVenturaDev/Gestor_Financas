'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Pencil, RotateCcw, Trash2, Zap } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { formatDate, todayISO } from '@/lib/date'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import {
  deletePurchase, payInstallment, settlePurchase, undoPayInstallment, updatePurchase,
} from '@/server/actions/cards'
import type { InstallmentStatus, PurchaseStatus, VCardInstallmentRow } from '@/lib/database.types'
import type { PurchaseItem } from '@/server/queries'

const SELO_PARCELA: Record<InstallmentStatus, { rotulo: string; classe: string }> = {
  paga: { rotulo: 'paga', classe: 'bg-receita/15 text-receita' },
  atrasada: { rotulo: 'atrasada', classe: 'bg-despesa/15 text-despesa' },
  em_aberto: { rotulo: 'em aberto', classe: 'bg-line/60 text-muted' },
}

const SELO_COMPRA: Record<PurchaseStatus, { rotulo: string; classe: string }> = {
  quitada: { rotulo: 'quitada', classe: 'bg-receita/15 text-receita' },
  atrasada: { rotulo: 'atrasada', classe: 'bg-despesa/15 text-despesa' },
  em_andamento: { rotulo: 'em andamento', classe: 'bg-line/60 text-muted' },
}

export function DetalheCompra({
  purchase,
  installments,
}: {
  purchase: PurchaseItem
  installments: VCardInstallmentRow[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [quitando, setQuitando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [editando, setEditando] = useState(false)
  const [pagando, setPagando] = useState<VCardInstallmentRow | null>(null)
  const [ocupado, iniciar] = useTransition()

  const selo = SELO_COMPRA[purchase.status]
  const temPagamento = purchase.paid_count > 0

  return (
    <>
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{purchase.description}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {purchase.bankName} · comprado em {formatDate(purchase.purchase_date)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${selo.classe}`}>
            {selo.rotulo}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-faint">Total</dt>
            <dd className="tabular mt-0.5 font-semibold">{formatBRL(purchase.total_cents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Em aberto</dt>
            <dd className="tabular mt-0.5 font-semibold text-despesa">
              {formatBRL(purchase.open_cents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Parcela atual</dt>
            <dd className="tabular mt-0.5 font-semibold">
              {purchase.current_number}/{purchase.installments_count}
            </dd>
          </div>
        </dl>

        {purchase.settled_at && (
          <p className="mt-3 rounded-xl bg-receita/10 px-3 py-2 text-sm text-receita">
            Quitada antecipadamente em {formatDate(purchase.settled_at)}.
          </p>
        )}
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="toque flex-col gap-1 rounded-xl border border-line bg-surface px-2 py-2 text-xs font-medium active:bg-line/40"
        >
          <Pencil size={17} />
          Editar
        </button>
        <button
          type="button"
          disabled={purchase.open_cents === 0}
          onClick={() => setQuitando(true)}
          className="toque flex-col gap-1 rounded-xl border border-line bg-surface px-2 py-2 text-xs font-medium active:bg-line/40 disabled:opacity-40"
        >
          <Zap size={17} />
          Quitar
        </button>
        <button
          type="button"
          onClick={() => setExcluindo(true)}
          className="toque flex-col gap-1 rounded-xl border border-line bg-surface px-2 py-2 text-xs font-medium text-despesa active:bg-line/40"
        >
          <Trash2 size={17} />
          Excluir
        </button>
      </div>

      <section>
        <h2 className="mb-2 text-[15px] font-semibold">Parcelas</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {installments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3.5 py-3">
              <span className="tabular w-11 shrink-0 text-sm text-faint">
                {p.number}/{purchase.installments_count}
              </span>
              <div className="min-w-0 flex-1">
                <p className="tabular text-sm">vence {formatDate(p.due_date)}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs">
                  <span className={`rounded-full px-1.5 py-0.5 ${SELO_PARCELA[p.status].classe}`}>
                    {SELO_PARCELA[p.status].rotulo}
                  </span>
                  {p.paid_at && (
                    <span className="tabular text-faint">pago em {formatDate(p.paid_at)}</span>
                  )}
                </p>
              </div>
              <span className="tabular shrink-0 font-semibold">{formatBRL(p.amount_cents)}</span>

              {p.paid_at ? (
                <button
                  type="button"
                  disabled={ocupado}
                  aria-label={`Desfazer pagamento da parcela ${p.number}`}
                  onClick={() =>
                    iniciar(async () => {
                      const res = await undoPayInstallment(p.id)
                      toast[res.ok ? 'sucesso' : 'erro'](
                        res.ok ? 'Pagamento desfeito.' : res.message,
                      )
                    })
                  }
                  className="toque -mr-2 shrink-0 rounded-full text-receita active:bg-line/50 disabled:opacity-50"
                >
                  <RotateCcw size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`Pagar parcela ${p.number}`}
                  onClick={() => setPagando(p)}
                  className="toque -mr-2 shrink-0 rounded-full text-faint active:bg-line/50"
                >
                  <CheckCircle2 size={20} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------- pagar */}
      <SheetData
        aberto={Boolean(pagando)}
        aoFechar={() => setPagando(null)}
        titulo="Registrar pagamento"
        descricao={
          pagando ? `Parcela ${pagando.number} — ${formatBRL(pagando.amount_cents)}` : undefined
        }
        textoBotao="Confirmar pagamento"
        aoConfirmar={async (data) => {
          if (!pagando) return
          const res = await payInstallment(pagando.id, data)
          toast[res.ok ? 'sucesso' : 'erro'](res.ok ? 'Parcela paga.' : res.message)
          setPagando(null)
        }}
      />

      {/* ------------------------------------------------------------ quitar */}
      <SheetData
        aberto={quitando}
        aoFechar={() => setQuitando(false)}
        titulo="Quitar antecipado"
        descricao={`Todas as parcelas em aberto (${formatBRL(purchase.open_cents)}) ficam pagas na data informada e saem da projeção. Os valores não mudam.`}
        textoBotao="Quitar compra"
        aoConfirmar={async (data) => {
          const res = await settlePurchase(purchase.id, data)
          toast[res.ok ? 'sucesso' : 'erro'](
            res.ok ? `${res.data.paid} parcela(s) quitada(s).` : res.message,
          )
          setQuitando(false)
        }}
      />

      {/* ----------------------------------------------------------- excluir */}
      <Sheet
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo="Excluir compra?"
        descricao="A compra e todas as parcelas somem das listas, da fatura e da projeção."
        rodape={
          <div className="flex gap-2">
            <Button variante="secundario" bloco onClick={() => setExcluindo(false)}>
              Cancelar
            </Button>
            <Button
              variante="perigo"
              bloco
              carregando={ocupado}
              onClick={() =>
                iniciar(async () => {
                  const res = await deletePurchase(purchase.id)
                  if (!res.ok) {
                    toast.erro(res.message)
                    return
                  }
                  toast.sucesso('Compra excluída.')
                  router.push('/app/cartoes')
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

      {/* ------------------------------------------------------------ editar */}
      <EditarCompra
        aberto={editando}
        aoFechar={() => setEditando(false)}
        purchase={purchase}
        travado={temPagamento}
      />
    </>
  )
}

function SheetData({
  aberto, aoFechar, titulo, descricao, textoBotao, aoConfirmar,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: string
  textoBotao: string
  aoConfirmar: (data: string) => Promise<void>
}) {
  const [data, setData] = useState(todayISO())
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      descricao={descricao}
      rodape={
        <Button bloco carregando={ocupado} onClick={() => iniciar(() => aoConfirmar(data))}>
          {textoBotao}
        </Button>
      }
    >
      <div className="pb-2">
        <Field label="Data" htmlFor="sd-data">
          <input
            id="sd-data"
            type="date"
            className="campo"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  )
}

function EditarCompra({
  aberto, aoFechar, purchase, travado,
}: {
  aberto: boolean
  aoFechar: () => void
  purchase: PurchaseItem
  travado: boolean
}) {
  const toast = useToast()
  const [descricao, setDescricao] = useState(purchase.description)
  const [dataCompra, setDataCompra] = useState(purchase.purchase_date)
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Editar compra"
      descricao={
        travado
          ? 'Esta compra já tem parcela paga: só descrição e data da compra podem mudar. Para um ajuste maior, exclua e cadastre de novo.'
          : undefined
      }
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              const res = await updatePurchase(purchase.id, {
                description: descricao,
                purchaseDate: dataCompra,
              })
              toast[res.ok ? 'sucesso' : 'erro'](res.ok ? 'Compra atualizada.' : res.message)
              if (res.ok) aoFechar()
            })
          }
        >
          Salvar
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <Field label="Descrição" htmlFor="e-desc">
          <input
            id="e-desc"
            className="campo"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={160}
          />
        </Field>
        <Field label="Data da compra" htmlFor="e-data">
          <input
            id="e-data"
            type="date"
            className="campo"
            value={dataCompra}
            onChange={(e) => setDataCompra(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  )
}
