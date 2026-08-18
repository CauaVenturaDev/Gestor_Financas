'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, ChevronRight, CreditCard, RotateCcw, Search } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { formatDate, todayISO } from '@/lib/date'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { payInstallment, undoPayInstallment } from '@/server/actions/cards'
import type { BankRow, InstallmentStatus } from '@/lib/database.types'
import type { InvoiceItem } from '@/server/queries'

const SELO: Record<InstallmentStatus, { rotulo: string; classe: string }> = {
  paga: { rotulo: 'paga', classe: 'bg-receita/15 text-receita' },
  atrasada: { rotulo: 'atrasada', classe: 'bg-despesa/15 text-despesa' },
  em_aberto: { rotulo: 'em aberto', classe: 'bg-line/60 text-muted' },
}

export function TelaFaturas({
  totalCents,
  paidCents,
  items,
  bancos,
  bankId,
}: {
  totalCents: number
  paidCents: number
  items: InvoiceItem[]
  bancos: BankRow[]
  bankId?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pagando, setPagando] = useState<InvoiceItem | null>(null)
  const [busca, setBusca] = useState(params.get('q') ?? '')
  const primeiraBusca = useRef(true)

  const aplicar = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    router.replace(`${pathname}${p.size ? `?${p}` : ''}`, { scroll: false })
  }

  // busca com atraso: não dispara request a cada tecla
  useEffect(() => {
    if (primeiraBusca.current) {
      primeiraBusca.current = false
      return
    }
    const t = setTimeout(() => aplicar({ q: busca.trim() || null }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  const nomeBanco = bancos.find((b) => b.id === bankId)?.name

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card p-3.5">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-faint">
            {nomeBanco ? `Fatura ${nomeBanco}` : 'Total do mês'}
          </p>
          <p className="tabular mt-1 text-xl font-semibold">{formatBRL(totalCents)}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Em aberto</p>
          <p className="tabular mt-1 text-xl font-semibold text-despesa">
            {formatBRL(totalCents - paidCents)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={bankId ?? ''}
          onChange={(e) => aplicar({ banco: e.target.value || null })}
          aria-label="Filtrar por banco"
          className="campo flex-1"
        >
          <option value="">Todos os bancos</option>
          {bancos.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={params.get('status') ?? ''}
          onChange={(e) => aplicar({ status: e.target.value || null })}
          aria-label="Filtrar por status"
          className="campo flex-1"
        >
          <option value="">Todos os status</option>
          <option value="em_aberto">Em aberto</option>
          <option value="atrasada">Atrasadas</option>
          <option value="paga">Pagas</option>
        </select>
      </div>

      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por descrição"
          aria-label="Buscar parcela por descrição"
          className="campo pl-9"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icone={<CreditCard size={28} />}
          titulo="Nenhuma parcela neste mês"
          descricao="Cadastre uma compra para ver a fatura aparecer aqui."
        />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-3.5 py-3">
              <Link
                href={`/app/cartoes/compra/${i.purchase_id}`}
                className="min-w-0 flex-1 active:opacity-70"
              >
                <p className="truncate font-medium leading-tight">{i.description}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-faint">
                  <span>{i.bankName}</span>
                  <span className="tabular">
                    {i.number}/{i.installmentsCount}
                  </span>
                  <span className="tabular">vence {formatDate(i.due_date)}</span>
                  <span className={`rounded-full px-1.5 py-0.5 ${SELO[i.status].classe}`}>
                    {SELO[i.status].rotulo}
                  </span>
                </p>
              </Link>

              <div className="shrink-0 text-right">
                <p className="tabular font-semibold">{formatBRL(i.amount_cents)}</p>
              </div>

              <BotaoPagamento parcela={i} aoPagar={() => setPagando(i)} />
            </li>
          ))}
        </ul>
      )}

      <SheetPagar parcela={pagando} aoFechar={() => setPagando(null)} />
    </>
  )
}

function BotaoPagamento({
  parcela,
  aoPagar,
}: {
  parcela: InvoiceItem
  aoPagar: () => void
}) {
  const toast = useToast()
  const [ocupado, iniciar] = useTransition()

  if (parcela.paid_at) {
    return (
      <button
        type="button"
        disabled={ocupado}
        aria-label={`Desfazer pagamento de ${parcela.description}`}
        onClick={() =>
          iniciar(async () => {
            const res = await undoPayInstallment(parcela.id)
            toast[res.ok ? 'sucesso' : 'erro'](res.ok ? 'Pagamento desfeito.' : res.message)
          })
        }
        className="toque -mr-2 shrink-0 rounded-full text-receita active:bg-line/50 disabled:opacity-50"
      >
        <RotateCcw size={18} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={aoPagar}
      aria-label={`Pagar ${parcela.description}`}
      className="toque -mr-2 shrink-0 rounded-full text-faint active:bg-line/50"
    >
      <CheckCircle2 size={20} />
    </button>
  )
}

function SheetPagar({
  parcela,
  aoFechar,
}: {
  parcela: InvoiceItem | null
  aoFechar: () => void
}) {
  const toast = useToast()
  const [data, setData] = useState(todayISO())
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={Boolean(parcela)}
      aoFechar={aoFechar}
      titulo="Registrar pagamento"
      descricao={
        parcela
          ? `${parcela.description} — parcela ${parcela.number}/${parcela.installmentsCount}, ${formatBRL(parcela.amount_cents)}`
          : undefined
      }
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              if (!parcela) return
              const res = await payInstallment(parcela.id, data)
              toast[res.ok ? 'sucesso' : 'erro'](res.ok ? 'Parcela paga.' : res.message)
              aoFechar()
            })
          }
        >
          Confirmar pagamento
        </Button>
      }
    >
      <div className="pb-2">
        <Field label="Data do pagamento" htmlFor="pg-data">
          <input
            id="pg-data"
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

export function AtalhosCartoes() {
  return (
    <div className="flex gap-2">
      <Link
        href="/app/cartoes/nova-compra"
        className="toque flex-1 gap-2 rounded-xl bg-brand px-4 font-medium text-brand-ink active:opacity-90"
      >
        Nova compra
      </Link>
      <Link
        href="/app/cartoes/projecao"
        className="toque gap-1 rounded-xl border border-line bg-surface px-4 font-medium active:bg-line/40"
      >
        Projeção
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
