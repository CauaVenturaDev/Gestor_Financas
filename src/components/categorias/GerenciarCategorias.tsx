'use client'

import { useMemo, useState, useTransition } from 'react'
import { Archive, ArchiveRestore, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import {
  createCategory, deleteCategory, renameCategory, setCategoryArchived,
} from '@/server/actions/categories'
import type { CategoryRow, Nature } from '@/lib/database.types'

const NATUREZAS: { valor: Nature; rotulo: string }[] = [
  { valor: 'receita', rotulo: 'Receita' },
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'investimento', rotulo: 'Investimento' },
]

export function GerenciarCategorias({
  categorias,
  contagens,
}: {
  categorias: CategoryRow[]
  contagens: Record<string, number>
}) {
  const [nature, setNature] = useState<Nature>('despesa')
  const [criando, setCriando] = useState(false)
  const [menu, setMenu] = useState<CategoryRow | null>(null)
  const [renomeando, setRenomeando] = useState<CategoryRow | null>(null)
  const [excluindo, setExcluindo] = useState<CategoryRow | null>(null)

  const doTipo = useMemo(
    () => categorias.filter((c) => c.nature === nature),
    [categorias, nature],
  )

  return (
    <>
      <div
        role="tablist"
        aria-label="Natureza da categoria"
        className="flex rounded-full border border-line bg-surface p-0.5 text-sm"
      >
        {NATUREZAS.map((n) => (
          <button
            key={n.valor}
            role="tab"
            aria-selected={nature === n.valor}
            onClick={() => setNature(n.valor)}
            className={`flex-1 rounded-full px-3 py-2 font-medium transition-colors ${
              nature === n.valor ? 'bg-ink text-bg' : 'text-muted'
            }`}
          >
            {n.rotulo}
          </button>
        ))}
      </div>

      <Button variante="secundario" bloco onClick={() => setCriando(true)}>
        <Plus size={17} />
        Nova categoria de {NATUREZAS.find((n) => n.valor === nature)!.rotulo.toLowerCase()}
      </Button>

      {doTipo.length === 0 ? (
        <EmptyState titulo="Nenhuma categoria aqui" />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {doTipo.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  {c.name}
                  {c.is_system && (
                    <span className="rounded-full bg-line/60 px-1.5 py-0.5 text-[11px] text-faint">
                      sistema
                    </span>
                  )}
                  {c.is_archived && (
                    <span className="rounded-full bg-alerta/15 px-1.5 py-0.5 text-[11px] text-alerta">
                      arquivada
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  {contagens[c.id] ?? 0} lançamento{(contagens[c.id] ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenu(c)}
                aria-label={`Ações de ${c.name}`}
                className="toque -mr-2 shrink-0 rounded-full text-faint active:bg-line/50"
              >
                <MoreVertical size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <NovaCategoria aberto={criando} aoFechar={() => setCriando(false)} nature={nature} />

      <MenuCategoria
        item={menu}
        aoFechar={() => setMenu(null)}
        aoRenomear={(c) => { setMenu(null); setRenomeando(c) }}
        aoExcluir={(c) => { setMenu(null); setExcluindo(c) }}
      />

      <RenomearCategoria item={renomeando} aoFechar={() => setRenomeando(null)} />

      <ExcluirCategoria
        item={excluindo}
        destinos={doTipo.filter((c) => c.id !== excluindo?.id && !c.is_archived)}
        aoFechar={() => setExcluindo(null)}
      />
    </>
  )
}

function NovaCategoria({
  aberto, aoFechar, nature,
}: {
  aberto: boolean
  aoFechar: () => void
  nature: Nature
}) {
  const toast = useToast()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={aberto}
      aoFechar={() => { setNome(''); setErro(undefined); aoFechar() }}
      titulo="Nova categoria"
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              const res = await createCategory({ nature, name: nome })
              if (!res.ok) { setErro(res.fieldErrors?.name ?? res.message); return }
              toast.sucesso('Categoria criada.')
              setNome('')
              setErro(undefined)
              aoFechar()
            })
          }
        >
          Criar
        </Button>
      }
    >
      <div className="pb-2">
        <Field label="Nome" htmlFor="cat-nome" erro={erro}>
          <input
            id="cat-nome"
            className="campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
            enterKeyHint="done"
          />
        </Field>
      </div>
    </Sheet>
  )
}

function MenuCategoria({
  item, aoFechar, aoRenomear, aoExcluir,
}: {
  item: CategoryRow | null
  aoFechar: () => void
  aoRenomear: (c: CategoryRow) => void
  aoExcluir: (c: CategoryRow) => void
}) {
  const toast = useToast()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={Boolean(item)}
      aoFechar={aoFechar}
      titulo={item?.name ?? ''}
      descricao={
        item?.is_system
          ? '"Sem categoria" é de sistema: não pode ser renomeada, arquivada nem excluída.'
          : undefined
      }
    >
      <div className="space-y-1.5 pb-2">
        <button
          type="button"
          disabled={item?.is_system}
          onClick={() => item && aoRenomear(item)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium active:bg-line/50 disabled:opacity-40"
        >
          <Pencil size={19} />
          Renomear
        </button>

        <button
          type="button"
          disabled={item?.is_system || ocupado}
          onClick={() =>
            iniciar(async () => {
              if (!item) return
              const res = await setCategoryArchived(item.id, !item.is_archived)
              toast[res.ok ? 'sucesso' : 'erro'](
                res.ok
                  ? item.is_archived
                    ? 'Categoria desarquivada.'
                    : 'Categoria arquivada: some das opções de novo lançamento, o histórico fica.'
                  : res.message,
              )
              aoFechar()
            })
          }
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium active:bg-line/50 disabled:opacity-40"
        >
          {item?.is_archived ? <ArchiveRestore size={19} /> : <Archive size={19} />}
          {item?.is_archived ? 'Desarquivar' : 'Arquivar'}
        </button>

        <button
          type="button"
          disabled={item?.is_system}
          onClick={() => item && aoExcluir(item)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium text-despesa active:bg-line/50 disabled:opacity-40"
        >
          <Trash2 size={19} />
          Excluir
        </button>
      </div>
    </Sheet>
  )
}

function RenomearCategoria({ item, aoFechar }: { item: CategoryRow | null; aoFechar: () => void }) {
  const toast = useToast()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={Boolean(item)}
      aoFechar={aoFechar}
      titulo="Renomear categoria"
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              if (!item) return
              const res = await renameCategory(item.id, nome || item.name)
              if (!res.ok) { setErro(res.fieldErrors?.name ?? res.message); return }
              toast.sucesso('Categoria renomeada.')
              setNome('')
              setErro(undefined)
              aoFechar()
            })
          }
        >
          Salvar
        </Button>
      }
    >
      <div className="pb-2">
        <Field label="Nome" htmlFor="cat-novo-nome" erro={erro}>
          <input
            id="cat-novo-nome"
            className="campo"
            defaultValue={item?.name}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
            enterKeyHint="done"
          />
        </Field>
      </div>
    </Sheet>
  )
}

/** RN14: excluir exige destino. Nenhum lançamento fica órfão. */
function ExcluirCategoria({
  item, destinos, aoFechar,
}: {
  item: CategoryRow | null
  destinos: CategoryRow[]
  aoFechar: () => void
}) {
  const toast = useToast()
  const [destino, setDestino] = useState('')
  const [ocupado, iniciar] = useTransition()
  const sistema = destinos.find((d) => d.is_system)

  return (
    <Sheet
      aberto={Boolean(item)}
      aoFechar={() => { setDestino(''); aoFechar() }}
      titulo="Excluir categoria"
      descricao="Os lançamentos que usam esta categoria precisam de um destino."
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
                const res = await deleteCategory(item.id, destino || null)
                if (!res.ok) { toast.erro(res.message); return }
                toast.sucesso(
                  res.data.moved > 0
                    ? `Categoria excluída. ${res.data.moved} lançamento(s) migrados.`
                    : 'Categoria excluída.',
                )
                setDestino('')
                aoFechar()
              })
            }
          >
            Excluir
          </Button>
        </div>
      }
    >
      <div className="pb-2">
        <Field label="Mover lançamentos para" htmlFor="cat-destino">
          <select
            id="cat-destino"
            className="campo"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          >
            <option value="">{sistema ? 'Sem categoria (padrão)' : 'Sem categoria'}</option>
            {destinos
              .filter((d) => !d.is_system)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
    </Sheet>
  )
}
