'use client'

import { useState, useTransition } from 'react'
import { Archive, ArchiveRestore, Landmark, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { createBank, deleteBank, renameBank, setBankArchived } from '@/server/actions/banks'
import type { BankRow } from '@/lib/database.types'

export function GerenciarBancos({
  bancos,
  emAberto,
}: {
  bancos: BankRow[]
  emAberto: Record<string, number>
}) {
  const [criando, setCriando] = useState(false)
  const [menu, setMenu] = useState<BankRow | null>(null)
  const [renomeando, setRenomeando] = useState<BankRow | null>(null)

  return (
    <>
      <Button variante="secundario" bloco onClick={() => setCriando(true)}>
        <Plus size={17} />
        Novo banco ou cartão
      </Button>

      {bancos.length === 0 ? (
        <EmptyState
          icone={<Landmark size={28} />}
          titulo="Nenhum banco cadastrado"
          descricao="Cadastre o primeiro para lançar compras parceladas."
        />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {bancos.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  {b.name}
                  {b.is_archived && (
                    <span className="rounded-full bg-alerta/15 px-1.5 py-0.5 text-[11px] text-alerta">
                      arquivado
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  {emAberto[b.id]
                    ? `${emAberto[b.id]} parcela(s) em aberto`
                    : 'nenhuma parcela em aberto'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenu(b)}
                aria-label={`Ações de ${b.name}`}
                className="toque -mr-2 shrink-0 rounded-full text-faint active:bg-line/50"
              >
                <MoreVertical size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FormBanco
        aberto={criando}
        aoFechar={() => setCriando(false)}
        titulo="Novo banco ou cartão"
        aoSalvar={async (nome) => {
          const res = await createBank({ name: nome })
          return res.ok ? null : (res.fieldErrors?.name ?? res.message)
        }}
      />

      <FormBanco
        aberto={Boolean(renomeando)}
        aoFechar={() => setRenomeando(null)}
        titulo="Renomear banco"
        valorInicial={renomeando?.name}
        aoSalvar={async (nome) => {
          if (!renomeando) return null
          const res = await renameBank(renomeando.id, nome)
          return res.ok ? null : (res.fieldErrors?.name ?? res.message)
        }}
      />

      <MenuBanco
        item={menu}
        aberto={Boolean(emAberto[menu?.id ?? ''])}
        aoFechar={() => setMenu(null)}
        aoRenomear={(b) => { setMenu(null); setRenomeando(b) }}
      />
    </>
  )
}

function FormBanco({
  aberto, aoFechar, titulo, valorInicial, aoSalvar,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  valorInicial?: string
  aoSalvar: (nome: string) => Promise<string | null>
}) {
  const toast = useToast()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={aberto}
      aoFechar={() => { setNome(''); setErro(undefined); aoFechar() }}
      titulo={titulo}
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              const problema = await aoSalvar(nome || valorInicial || '')
              if (problema) { setErro(problema); return }
              toast.sucesso('Pronto.')
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
        <Field label="Nome" htmlFor="bk-nome" erro={erro}>
          <input
            id="bk-nome"
            className="campo"
            defaultValue={valorInicial}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
            placeholder="Nubank"
          />
        </Field>
      </div>
    </Sheet>
  )
}

function MenuBanco({
  item, aberto, aoFechar, aoRenomear,
}: {
  item: BankRow | null
  aberto: boolean
  aoFechar: () => void
  aoRenomear: (b: BankRow) => void
}) {
  const toast = useToast()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={Boolean(item)}
      aoFechar={aoFechar}
      titulo={item?.name ?? ''}
      descricao={
        aberto ? 'Este banco tem parcelas em aberto, então não pode ser excluído.' : undefined
      }
    >
      <div className="space-y-1.5 pb-2">
        <button
          type="button"
          onClick={() => item && aoRenomear(item)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium active:bg-line/50"
        >
          <Pencil size={19} />
          Renomear
        </button>

        <button
          type="button"
          disabled={ocupado}
          onClick={() =>
            iniciar(async () => {
              if (!item) return
              const res = await setBankArchived(item.id, !item.is_archived)
              toast[res.ok ? 'sucesso' : 'erro'](
                res.ok
                  ? item.is_archived
                    ? 'Banco desarquivado.'
                    : 'Banco arquivado.'
                  : res.message,
              )
              aoFechar()
            })
          }
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium active:bg-line/50 disabled:opacity-50"
        >
          {item?.is_archived ? <ArchiveRestore size={19} /> : <Archive size={19} />}
          {item?.is_archived ? 'Desarquivar' : 'Arquivar'}
        </button>

        <button
          type="button"
          disabled={ocupado || aberto}
          onClick={() =>
            iniciar(async () => {
              if (!item) return
              const res = await deleteBank(item.id)
              toast[res.ok ? 'sucesso' : 'erro'](res.ok ? 'Banco excluído.' : res.message)
              aoFechar()
            })
          }
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-medium text-despesa active:bg-line/50 disabled:opacity-40"
        >
          <Trash2 size={19} />
          Excluir
        </button>
      </div>
    </Sheet>
  )
}
