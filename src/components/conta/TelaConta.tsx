'use client'

import { useState, useTransition } from 'react'
import { KeyRound, LogOut, Trash2, UserRound } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { changePassword, deleteAccount, updateDisplayName } from '@/server/actions/account'
import { signOutAction } from '@/server/actions/auth'

export function TelaConta({ nome, email }: { nome: string; email: string }) {
  const [editandoNome, setEditandoNome] = useState(false)
  const [trocandoSenha, setTrocandoSenha] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [saindo, iniciarSaida] = useTransition()

  return (
    <>
      <section className="card divide-y divide-line overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <UserRound size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{nome || 'Sem nome'}</p>
            <p className="truncate text-sm text-muted">{email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditandoNome(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-medium active:bg-line/40"
        >
          <UserRound size={19} className="text-muted" />
          Alterar nome
        </button>

        <button
          type="button"
          onClick={() => setTrocandoSenha(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-medium active:bg-line/40"
        >
          <KeyRound size={19} className="text-muted" />
          Alterar senha
        </button>

        <button
          type="button"
          disabled={saindo}
          onClick={() => iniciarSaida(() => signOutAction())}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-medium active:bg-line/40 disabled:opacity-50"
        >
          <LogOut size={19} className="text-muted" />
          Sair
        </button>
      </section>

      <section className="card overflow-hidden border-despesa/30">
        <button
          type="button"
          onClick={() => setExcluindo(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-medium text-despesa active:bg-despesa/10"
        >
          <Trash2 size={19} />
          Excluir conta
        </button>
      </section>

      <p className="px-1 text-xs leading-relaxed text-faint">
        Excluir a conta apaga todos os seus dados definitivamente, em cascata, e remove o login.
        Não é possível desfazer.
      </p>

      <AlterarNome aberto={editandoNome} aoFechar={() => setEditandoNome(false)} nome={nome} />
      <AlterarSenha aberto={trocandoSenha} aoFechar={() => setTrocandoSenha(false)} />
      <ExcluirConta aberto={excluindo} aoFechar={() => setExcluindo(false)} />
    </>
  )
}

function AlterarNome({
  aberto, aoFechar, nome,
}: {
  aberto: boolean
  aoFechar: () => void
  nome: string
}) {
  const toast = useToast()
  const [valor, setValor] = useState(nome)
  const [erro, setErro] = useState<string | undefined>()
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Alterar nome"
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              const res = await updateDisplayName(valor)
              if (!res.ok) { setErro(res.fieldErrors?.nome ?? res.message); return }
              toast.sucesso('Nome atualizado.')
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
        <Field label="Nome" htmlFor="ct-nome" erro={erro}>
          <input
            id="ct-nome"
            className="campo"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            maxLength={80}
            autoComplete="name"
          />
        </Field>
      </div>
    </Sheet>
  )
}

function AlterarSenha({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const toast = useToast()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [ocupado, iniciar] = useTransition()

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Alterar senha"
      descricao="As outras sessões abertas são desconectadas."
      rodape={
        <Button
          bloco
          carregando={ocupado}
          onClick={() =>
            iniciar(async () => {
              const res = await changePassword(atual, nova)
              if (!res.ok) {
                setErros(res.fieldErrors ?? {})
                toast.erro(res.message)
                return
              }
              toast.sucesso('Senha alterada.')
              setAtual('')
              setNova('')
              setErros({})
              aoFechar()
            })
          }
        >
          Salvar nova senha
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <Field label="Senha atual" htmlFor="ct-atual" erro={erros.atual}>
          <input
            id="ct-atual"
            type="password"
            className="campo"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="Nova senha" htmlFor="ct-nova" erro={erros.nova} dica="Mínimo de 8 caracteres.">
          <input
            id="ct-nova"
            type="password"
            className="campo"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </Field>
      </div>
    </Sheet>
  )
}

/** Confirmação dupla: continuar e depois digitar EXCLUIR. */
function ExcluirConta({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const [etapa, setEtapa] = useState<1 | 2>(1)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [ocupado, iniciar] = useTransition()

  const fechar = () => {
    setEtapa(1)
    setTexto('')
    setErro(undefined)
    aoFechar()
  }

  return (
    <Sheet
      aberto={aberto}
      aoFechar={fechar}
      titulo="Excluir conta"
      descricao={
        etapa === 1
          ? 'Todos os lançamentos, categorias, regras recorrentes, bancos e compras somem para sempre.'
          : 'Confirmação final: digite EXCLUIR para apagar tudo.'
      }
      rodape={
        <div className="flex gap-2">
          <Button variante="secundario" bloco onClick={fechar} disabled={ocupado}>
            Cancelar
          </Button>
          {etapa === 1 ? (
            <Button variante="perigo" bloco onClick={() => setEtapa(2)}>
              Continuar
            </Button>
          ) : (
            <Button
              variante="perigo"
              bloco
              carregando={ocupado}
              onClick={() =>
                iniciar(async () => {
                  const res = await deleteAccount(texto)
                  if (res && !res.ok) setErro(res.fieldErrors?.confirmation ?? res.message)
                })
              }
            >
              Excluir para sempre
            </Button>
          )}
        </div>
      }
    >
      <div className="pb-2">
        {etapa === 2 && (
          <Field label="Digite EXCLUIR" htmlFor="ct-conf" erro={erro}>
            <input
              id="ct-conf"
              className="campo"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="EXCLUIR"
            />
          </Field>
        )}
      </div>
    </Sheet>
  )
}
