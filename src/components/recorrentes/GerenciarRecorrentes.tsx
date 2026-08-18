'use client'

import { useState, useTransition } from 'react'
import {
  CirclePause, CirclePlay, CircleStop, MoreVertical, Pencil, Plus, Repeat, Trash2,
} from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatBRL } from '@/lib/money'
import { currentYm, formatDate, formatYmShort, ymOf } from '@/lib/date'
import {
  createRecurrence, deleteRecurrence, setRecurrenceStatus, updateRecurrence,
} from '@/server/actions/recurrences'
import type { CategoryRow, RecStatus } from '@/lib/database.types'
import type { RuleItem } from '@/server/queries'

const SELO: Record<RecStatus, string> = {
  ativa: 'bg-receita/15 text-receita',
  pausada: 'bg-alerta/15 text-alerta',
  encerrada: 'bg-line/60 text-faint',
}

export function GerenciarRecorrentes({
  regras,
  categorias,
}: {
  regras: RuleItem[]
  categorias: CategoryRow[]
}) {
  const [editor, setEditor] = useState<{ aberto: boolean; regra: RuleItem | null }>({
    aberto: false,
    regra: null,
  })
  const [menu, setMenu] = useState<RuleItem | null>(null)
  const [excluindo, setExcluindo] = useState<RuleItem | null>(null)

  return (
    <>
      <Button variante="secundario" bloco onClick={() => setEditor({ aberto: true, regra: null })}>
        <Plus size={17} />
        Nova regra recorrente
      </Button>

      {regras.length === 0 ? (
        <EmptyState
          icone={<Repeat size={28} />}
          titulo="Nenhuma regra recorrente"
          descricao="Crie uma regra para o salário, o aluguel ou a assinatura entrarem sozinhos todo mês."
        />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {regras.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  {r.name}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${SELO[r.status]}`}>
                    {r.status}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  {r.kind === 'receita' ? 'Receita' : 'Despesa'} · dia {r.day_of_month} ·{' '}
                  {r.amount_cents === null ? 'valor variável' : formatBRL(r.amount_cents)}
                  {r.categoryName ? ` · ${r.categoryName}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  {formatYmShort(ymOf(r.start_date))} até{' '}
                  {r.end_date ? formatYmShort(ymOf(r.end_date)) : 'sem fim'}
                  {r.nextOccurrence && ` · próxima em ${formatDate(r.nextOccurrence)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenu(r)}
                aria-label={`Ações de ${r.name}`}
                className="toque -mr-2 shrink-0 rounded-full text-faint active:bg-line/50"
              >
                <MoreVertical size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <EditorRegra
        aberto={editor.aberto}
        regra={editor.regra}
        categorias={categorias}
        aoFechar={() => setEditor({ aberto: false, regra: null })}
      />

      <MenuRegra
        item={menu}
        aoFechar={() => setMenu(null)}
        aoEditar={(r) => { setMenu(null); setEditor({ aberto: true, regra: r }) }}
        aoExcluir={(r) => { setMenu(null); setExcluindo(r) }}
      />

      <ExcluirRegra item={excluindo} aoFechar={() => setExcluindo(null)} />
    </>
  )
}

function EditorRegra({
  aberto, regra, categorias, aoFechar,
}: {
  aberto: boolean
  regra: RuleItem | null
  categorias: CategoryRow[]
  aoFechar: () => void
}) {
  const toast = useToast()
  const [ocupado, iniciar] = useTransition()
  const [erros, setErros] = useState<Record<string, string>>({})

  const [kind, setKind] = useState<'receita' | 'despesa'>(regra?.kind ?? 'despesa')
  const [nome, setNome] = useState(regra?.name ?? '')
  const [valor, setValor] = useState<number | null>(regra?.amount_cents ?? null)
  const [variavel, setVariavel] = useState(regra ? regra.amount_cents === null : false)
  const [dia, setDia] = useState(String(regra?.day_of_month ?? 5))
  const [inicio, setInicio] = useState(regra ? ymOf(regra.start_date) : currentYm())
  const [fim, setFim] = useState(regra?.end_date ? ymOf(regra.end_date) : '')
  const [categoria, setCategoria] = useState(regra?.category_id ?? '')
  const [observacao, setObservacao] = useState(regra?.note ?? '')

  // remonta o formulário sempre que a regra em edição muda
  const chave = regra?.id ?? 'nova'
  const [chaveAtual, setChaveAtual] = useState(chave)
  if (chaveAtual !== chave) {
    setChaveAtual(chave)
    setKind(regra?.kind ?? 'despesa')
    setNome(regra?.name ?? '')
    setValor(regra?.amount_cents ?? null)
    setVariavel(regra ? regra.amount_cents === null : false)
    setDia(String(regra?.day_of_month ?? 5))
    setInicio(regra ? ymOf(regra.start_date) : currentYm())
    setFim(regra?.end_date ? ymOf(regra.end_date) : '')
    setCategoria(regra?.category_id ?? '')
    setObservacao(regra?.note ?? '')
    setErros({})
  }

  const doTipo = categorias.filter((c) => c.nature === kind && !c.is_archived)

  const salvar = () =>
    iniciar(async () => {
      setErros({})
      const payload = {
        kind,
        name: nome,
        categoryId: categoria || null,
        amountCents: variavel ? null : valor,
        dayOfMonth: Number(dia),
        startYm: inicio,
        endYm: fim || null,
        note: observacao || null,
        autoConfirm: !variavel,
      }
      const res = regra
        ? await updateRecurrence({ ...payload, id: regra.id })
        : await createRecurrence(payload)

      if (!res.ok) {
        setErros(res.fieldErrors ?? {})
        toast.erro(res.message)
        return
      }
      toast.sucesso(
        regra
          ? 'Regra atualizada. As previstas futuras assumiram o novo padrão.'
          : 'Regra criada.',
      )
      aoFechar()
    })

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={regra ? 'Editar regra' : 'Nova regra recorrente'}
      descricao={
        regra
          ? 'A mudança vale para esta e para as futuras. As ocorrências já efetivadas ficam intactas.'
          : undefined
      }
      rodape={
        <Button bloco carregando={ocupado} onClick={salvar}>
          {regra ? 'Salvar alterações' : 'Criar regra'}
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        {!regra && (
          <div role="tablist" className="flex rounded-full border border-line bg-surface p-0.5 text-sm">
            {(['receita', 'despesa'] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => { setKind(k); setCategoria('') }}
                className={`flex-1 rounded-full px-3 py-2 font-medium capitalize ${
                  kind === k ? 'bg-ink text-bg' : 'text-muted'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        <Field label="Nome" htmlFor="rec-nome" erro={erros.name}>
          <input
            id="rec-nome"
            className="campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={120}
            placeholder={kind === 'receita' ? 'Salário' : 'Aluguel'}
          />
        </Field>

        <Field label="Valor" htmlFor="rec-valor" erro={erros.amountCents}>
          <MoneyInput id="rec-valor" value={valor} onChange={setValor} disabled={variavel} />
        </Field>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-line"
            checked={variavel}
            onChange={(e) => setVariavel(e.target.checked)}
          />
          Valor muda todo mês (confirmo na hora)
        </label>

        <Field
          label="Dia do vencimento"
          htmlFor="rec-dia2"
          erro={erros.dayOfMonth}
          dica="Em meses mais curtos, cai no último dia."
        >
          <input
            id="rec-dia2"
            type="text"
            inputMode="numeric"
            className="campo tabular"
            value={dia}
            onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" htmlFor="rec-ini" erro={erros.startYm}>
            <input
              id="rec-ini"
              type="month"
              className="campo"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </Field>
          <Field label="Fim (opcional)" htmlFor="rec-fim2" erro={erros.endYm}>
            <input
              id="rec-fim2"
              type="month"
              className="campo"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Categoria" htmlFor="rec-cat">
          <select
            id="rec-cat"
            className="campo"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {doTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Observação" htmlFor="rec-obs">
          <textarea
            id="rec-obs"
            className="campo min-h-[72px] resize-none"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={500}
            placeholder="Opcional"
          />
        </Field>
      </div>
    </Sheet>
  )
}

function MenuRegra({
  item, aoFechar, aoEditar, aoExcluir,
}: {
  item: RuleItem | null
  aoFechar: () => void
  aoEditar: (r: RuleItem) => void
  aoExcluir: (r: RuleItem) => void
}) {
  const toast = useToast()
  const [ocupado, iniciar] = useTransition()

  const mudarStatus = (status: RecStatus, mensagem: string) =>
    iniciar(async () => {
      if (!item) return
      const res = await setRecurrenceStatus(
        item.id,
        status,
        status === 'encerrada' ? currentYm() : undefined,
      )
      toast[res.ok ? 'sucesso' : 'erro'](res.ok ? mensagem : res.message)
      aoFechar()
    })

  return (
    <Sheet aberto={Boolean(item)} aoFechar={aoFechar} titulo={item?.name ?? ''}>
      <div className="space-y-1.5 pb-2">
        <button
          type="button"
          onClick={() => item && aoEditar(item)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium active:bg-line/50"
        >
          <Pencil size={19} />
          Editar (esta e futuras)
        </button>

        {item?.status === 'ativa' ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              mudarStatus('pausada', 'Regra pausada. As previstas futuras foram removidas.')
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium active:bg-line/50 disabled:opacity-50"
          >
            <CirclePause size={19} />
            Pausar
          </button>
        ) : (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => mudarStatus('ativa', 'Regra retomada. As ocorrências voltaram a gerar.')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium active:bg-line/50 disabled:opacity-50"
          >
            <CirclePlay size={19} />
            Retomar
          </button>
        )}

        <button
          type="button"
          disabled={ocupado || item?.status === 'encerrada'}
          onClick={() => mudarStatus('encerrada', 'Regra encerrada neste mês.')}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium active:bg-line/50 disabled:opacity-40"
        >
          <CircleStop size={19} />
          Encerrar neste mês
        </button>

        <button
          type="button"
          onClick={() => item && aoExcluir(item)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium text-despesa active:bg-line/50"
        >
          <Trash2 size={19} />
          Excluir regra
        </button>
      </div>
    </Sheet>
  )
}

function ExcluirRegra({ item, aoFechar }: { item: RuleItem | null; aoFechar: () => void }) {
  const toast = useToast()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={Boolean(item)}
      aoFechar={aoFechar}
      titulo="Excluir regra?"
      descricao="A regra para de gerar e as ocorrências previstas futuras somem. O que já foi efetivado continua no histórico."
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
                const res = await deleteRecurrence(item.id)
                toast[res.ok ? 'sucesso' : 'erro'](res.ok ? 'Regra excluída.' : res.message)
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
