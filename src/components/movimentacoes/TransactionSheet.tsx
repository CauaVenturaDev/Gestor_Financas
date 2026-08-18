'use client'

import { useEffect, useState, useTransition } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { useToast } from '@/components/ui/Toast'
import { MIN_DATE, currentYm, maxDate, todayISO, ymOf } from '@/lib/date'
import { createTransaction, updateTransaction } from '@/server/actions/transactions'
import { createRecurrence } from '@/server/actions/recurrences'
import type { CategoryRow, Kind } from '@/lib/database.types'
import type { TxItem } from '@/server/queries'

const TITULOS: Record<Kind, { novo: string; editar: string }> = {
  receita: { novo: 'Nova receita', editar: 'Editar receita' },
  despesa: { novo: 'Nova despesa', editar: 'Editar despesa' },
  aporte: { novo: 'Novo aporte', editar: 'Editar aporte' },
  resgate: { novo: 'Novo resgate', editar: 'Editar resgate' },
}

interface Props {
  aberto: boolean
  aoFechar: () => void
  kind: Kind
  categorias: CategoryRow[]
  transacao?: TxItem | null
}

/**
 * Formulário de lançamento. A seção da UI define o kind — não existe campo de
 * tipo, como pedido. O toggle "repete todo mês" só aparece em receita e despesa
 * (aporte recorrente está fora do MVP) e só na criação.
 */
export function TransactionSheet({ aberto, aoFechar, kind, categorias, transacao }: Props) {
  const editando = Boolean(transacao)
  const ehOcorrencia = Boolean(transacao?.recurrence_id)
  const podeRepetir = !editando && (kind === 'receita' || kind === 'despesa')

  const toast = useToast()
  const [salvando, iniciar] = useTransition()
  const [erros, setErros] = useState<Record<string, string>>({})

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState<number | null>(null)
  const [data, setData] = useState(todayISO())
  const [categoria, setCategoria] = useState('')
  const [observacao, setObservacao] = useState('')
  const [escopo, setEscopo] = useState<'apenas_esta' | 'esta_e_futuras'>('apenas_esta')

  const [repete, setRepete] = useState(false)
  const [dia, setDia] = useState(String(new Date().getDate()))
  const [inicio, setInicio] = useState(currentYm())
  const [fim, setFim] = useState('')
  const [valorVariavel, setValorVariavel] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setErros({})
    setEscopo('apenas_esta')
    if (transacao) {
      setNome(transacao.name)
      setValor(transacao.amount_cents)
      setData(transacao.date)
      setCategoria(transacao.category_id ?? '')
      setObservacao(transacao.note ?? '')
      setRepete(false)
    } else {
      setNome('')
      setValor(null)
      setData(todayISO())
      setCategoria('')
      setObservacao('')
      setRepete(false)
      setValorVariavel(false)
      setDia(String(Number(todayISO().slice(8, 10))))
      setInicio(currentYm())
      setFim('')
    }
  }, [aberto, transacao])

  useEffect(() => {
    if (repete) setInicio(ymOf(data))
  }, [repete, data])

  const salvar = () =>
    iniciar(async () => {
      setErros({})

      if (repete) {
        const res = await createRecurrence({
          kind: kind as 'receita' | 'despesa',
          name: nome,
          categoryId: categoria || null,
          amountCents: valorVariavel ? null : valor,
          dayOfMonth: Number(dia),
          startYm: inicio,
          endYm: fim || null,
          note: observacao || null,
          autoConfirm: !valorVariavel,
        })
        if (!res.ok) {
          setErros(res.fieldErrors ?? {})
          toast.erro(res.message)
          return
        }
        toast.sucesso('Recorrência criada. As ocorrências já aparecem no mês.')
        aoFechar()
        return
      }

      const res = editando
        ? await updateTransaction({
            id: transacao!.id,
            name: nome,
            date: data,
            amountCents: valor,
            categoryId: categoria || null,
            note: observacao || null,
            scope: escopo,
          })
        : await createTransaction({
            kind,
            name: nome,
            date: data,
            amountCents: valor,
            categoryId: categoria || null,
            note: observacao || null,
          })

      if (!res.ok) {
        setErros(res.fieldErrors ?? {})
        toast.erro(res.message)
        return
      }
      toast.sucesso(editando ? 'Lançamento atualizado.' : 'Lançamento salvo.')
      aoFechar()
    })

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={editando ? TITULOS[kind].editar : TITULOS[kind].novo}
      descricao={
        ehOcorrencia ? 'Esta é uma ocorrência de uma regra que repete todo mês.' : undefined
      }
      rodape={
        <Button bloco onClick={salvar} carregando={salvando}>
          {editando ? 'Salvar alterações' : 'Salvar'}
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <Field label="Nome" htmlFor="tx-nome" erro={erros.name}>
          <input
            id="tx-nome"
            className="campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={120}
            enterKeyHint="next"
            placeholder={kind === 'despesa' ? 'Mercado' : 'Salário'}
          />
        </Field>

        <Field
          label={valorVariavel && repete ? 'Valor (definido a cada mês)' : 'Valor'}
          htmlFor="tx-valor"
          erro={erros.amountCents}
        >
          <MoneyInput
            id="tx-valor"
            value={valor}
            onChange={setValor}
            disabled={repete && valorVariavel}
          />
        </Field>

        {!repete && (
          <Field label="Data" htmlFor="tx-data" erro={erros.date}>
            <input
              id="tx-data"
              type="date"
              className="campo"
              value={data}
              min={MIN_DATE}
              max={maxDate()}
              onChange={(e) => setData(e.target.value)}
            />
          </Field>
        )}

        <Field label="Categoria" htmlFor="tx-categoria" erro={erros.categoryId}>
          <select
            id="tx-categoria"
            className="campo"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Observação" htmlFor="tx-obs">
          <textarea
            id="tx-obs"
            className="campo min-h-[80px] resize-none"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={500}
            placeholder="Opcional"
          />
        </Field>

        {podeRepetir && (
          <div className="card p-3.5">
            <label className="flex items-center justify-between gap-3">
              <span className="font-medium">Repete todo mês</span>
              <input
                type="checkbox"
                className="h-6 w-11 shrink-0 appearance-none rounded-full bg-line
                           transition-colors checked:bg-brand
                           before:block before:h-5 before:w-5 before:translate-x-0.5
                           before:translate-y-0.5 before:rounded-full before:bg-white
                           before:transition-transform checked:before:translate-x-[1.375rem]"
                checked={repete}
                onChange={(e) => setRepete(e.target.checked)}
              />
            </label>

            {repete && (
              <div className="mt-4 space-y-4 border-t border-line pt-4">
                <Field label="Dia do vencimento" htmlFor="rec-dia" erro={erros.dayOfMonth}
                  dica="Em meses mais curtos, cai no último dia.">
                  <input
                    id="rec-dia"
                    type="text"
                    inputMode="numeric"
                    className="campo tabular"
                    value={dia}
                    onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Início" htmlFor="rec-inicio" erro={erros.startYm}>
                    <input
                      id="rec-inicio"
                      type="month"
                      className="campo"
                      value={inicio}
                      onChange={(e) => setInicio(e.target.value)}
                    />
                  </Field>
                  <Field label="Fim (opcional)" htmlFor="rec-fim" erro={erros.endYm}>
                    <input
                      id="rec-fim"
                      type="month"
                      className="campo"
                      value={fim}
                      onChange={(e) => setFim(e.target.value)}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-line"
                    checked={valorVariavel}
                    onChange={(e) => setValorVariavel(e.target.checked)}
                  />
                  Valor muda todo mês (confirmo na hora)
                </label>
              </div>
            )}
          </div>
        )}

        {editando && ehOcorrencia && (
          <fieldset className="card p-3.5">
            <legend className="px-1 text-sm font-medium text-muted">Aplicar em</legend>
            <div className="mt-1 space-y-2.5">
              {(
                [
                  ['apenas_esta', 'Somente esta ocorrência'],
                  ['esta_e_futuras', 'Esta e as futuras'],
                ] as const
              ).map(([v, r]) => (
                <label key={v} className="flex items-center gap-2.5 text-sm">
                  <input
                    type="radio"
                    name="escopo"
                    className="h-5 w-5"
                    checked={escopo === v}
                    onChange={() => setEscopo(v)}
                  />
                  {r}
                </label>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-faint">
              As ocorrências já efetivadas no passado nunca mudam.
            </p>
          </fieldset>
        )}
      </div>
    </Sheet>
  )
}
