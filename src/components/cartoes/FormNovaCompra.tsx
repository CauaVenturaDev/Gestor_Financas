'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Sheet } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { formatBRL } from '@/lib/money'
import { MIN_DATE, formatDate, maxDate, todayISO } from '@/lib/date'
import { previewInstallments } from '@/lib/installments'
import { createPurchase } from '@/server/actions/cards'
import { createBank } from '@/server/actions/banks'
import type { BankRow } from '@/lib/database.types'

/**
 * A pré-visualização das parcelas aparece antes de salvar: é a defesa contra
 * compra antiga importada errada. O cálculo aqui espelha o motor do banco
 * (RN15, RN16, RN18), que é quem grava de verdade.
 */
export function FormNovaCompra({ bancos }: { bancos: BankRow[] }) {
  const router = useRouter()
  const toast = useToast()
  const [salvando, iniciar] = useTransition()
  const [erros, setErros] = useState<Record<string, string>>({})

  const [bankId, setBankId] = useState(bancos[0]?.id ?? '')
  const [dataCompra, setDataCompra] = useState(todayISO())
  const [descricao, setDescricao] = useState('')
  const [total, setTotal] = useState<number | null>(null)
  const [parcelas, setParcelas] = useState('1')
  const [parcelaAtual, setParcelaAtual] = useState('1')
  const [vencAtual, setVencAtual] = useState(todayISO())
  const [novoBanco, setNovoBanco] = useState(false)

  const count = Math.min(48, Math.max(1, Number(parcelas) || 1))
  const current = Math.min(count, Math.max(1, Number(parcelaAtual) || 1))

  const previa = useMemo(
    () =>
      total
        ? previewInstallments({
            totalCents: total,
            count,
            currentNumber: current,
            currentDueDate: vencAtual,
          })
        : [],
    [total, count, current, vencAtual],
  )

  const salvar = () =>
    iniciar(async () => {
      setErros({})
      const res = await createPurchase({
        bankId,
        purchaseDate: dataCompra,
        description: descricao,
        totalCents: total,
        count,
        currentNumber: current,
        currentDueDate: vencAtual,
      })
      if (!res.ok) {
        setErros(res.fieldErrors ?? {})
        toast.erro(res.message)
        return
      }
      toast.sucesso('Compra cadastrada e parcelas geradas.')
      router.push(`/app/cartoes/compra/${res.data.id}`)
    })

  return (
    <>
      <div className="space-y-4">
        <Field label="Banco / cartão" htmlFor="c-banco" erro={erros.bankId}>
          <div className="flex gap-2">
            <select
              id="c-banco"
              className="campo flex-1"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
            >
              {bancos.length === 0 && <option value="">Cadastre um banco</option>}
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNovoBanco(true)}
              aria-label="Cadastrar banco"
              className="toque shrink-0 rounded-xl border border-line bg-surface px-3 text-muted active:bg-line/40"
            >
              <Plus size={18} />
            </button>
          </div>
        </Field>

        <Field label="Descrição" htmlFor="c-desc" erro={erros.description}>
          <input
            id="c-desc"
            className="campo"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={160}
            placeholder="Geladeira"
          />
        </Field>

        <Field label="Data da compra" htmlFor="c-data" erro={erros.purchaseDate}>
          <input
            id="c-data"
            type="date"
            className="campo"
            value={dataCompra}
            min={MIN_DATE}
            max={maxDate()}
            onChange={(e) => setDataCompra(e.target.value)}
          />
        </Field>

        <Field label="Valor total" htmlFor="c-total" erro={erros.totalCents}>
          <MoneyInput id="c-total" value={total} onChange={setTotal} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Parcelas" htmlFor="c-n" erro={erros.count}>
            <input
              id="c-n"
              type="text"
              inputMode="numeric"
              className="campo tabular"
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </Field>
          <Field
            label="Parcela atual"
            htmlFor="c-atual"
            erro={erros.currentNumber}
            dica="1 para compra nova."
          >
            <input
              id="c-atual"
              type="text"
              inputMode="numeric"
              className="campo tabular"
              value={parcelaAtual}
              onChange={(e) => setParcelaAtual(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </Field>
        </div>

        <Field
          label={current > 1 ? `Vencimento da parcela ${current}` : 'Vencimento da 1ª parcela'}
          htmlFor="c-venc"
          erro={erros.currentDueDate}
          dica={
            current > 1
              ? 'As parcelas anteriores nascem pagas e a agenda é reconstituída para trás.'
              : undefined
          }
        >
          <input
            id="c-venc"
            type="date"
            className="campo"
            value={vencAtual}
            min={MIN_DATE}
            max={maxDate()}
            onChange={(e) => setVencAtual(e.target.value)}
          />
        </Field>

        {previa.length > 0 && (
          <section className="card overflow-hidden">
            <header className="flex items-baseline justify-between border-b border-line px-3.5 py-2.5">
              <h2 className="text-sm font-semibold">Parcelas que serão criadas</h2>
              <span className="tabular text-sm text-muted">
                soma {formatBRL(previa.reduce((s, p) => s + p.amountCents, 0))}
              </span>
            </header>
            <ul className="rolagem max-h-64 divide-y divide-line overflow-y-auto text-sm">
              {previa.map((p) => (
                <li key={p.number} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="tabular w-10 shrink-0 text-faint">
                    {p.number}/{previa.length}
                  </span>
                  <span className="tabular flex-1 text-muted">{formatDate(p.dueDate)}</span>
                  {p.bornPaid && (
                    <span className="rounded-full bg-receita/15 px-1.5 py-0.5 text-[11px] text-receita">
                      já paga
                    </span>
                  )}
                  <span className="tabular font-medium">{formatBRL(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Button
          bloco
          carregando={salvando}
          disabled={!bankId || !total || !descricao}
          onClick={salvar}
        >
          Cadastrar compra
        </Button>
      </div>

      <NovoBancoSheet
        aberto={novoBanco}
        aoFechar={() => setNovoBanco(false)}
        aoCriar={(id) => setBankId(id)}
      />
    </>
  )
}

function NovoBancoSheet({
  aberto,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean
  aoFechar: () => void
  aoCriar: (id: string) => void
}) {
  const toast = useToast()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo banco ou cartão"
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              const res = await createBank({ name: nome })
              if (!res.ok) {
                setErro(res.fieldErrors?.name ?? res.message)
                return
              }
              aoCriar(res.data.id)
              toast.sucesso('Banco cadastrado.')
              setNome('')
              setErro(undefined)
              router.refresh()
              aoFechar()
            })
          }
        >
          Cadastrar
        </Button>
      }
    >
      <div className="pb-2">
        <Field label="Nome" htmlFor="b-nome" erro={erro}>
          <input
            id="b-nome"
            className="campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
            placeholder="Nubank"
          />
        </Field>
      </div>
    </Sheet>
  )
}
