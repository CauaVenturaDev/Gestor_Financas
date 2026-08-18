'use client'

import { useActionState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { FormState } from '@/server/actions/auth'
import { Button } from '@/components/ui/Button'

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
  textoBotao: string
  children: (estado: {
    erros: Record<string, string>
    pendente: boolean
  }) => React.ReactNode
}

export function AuthForm({ action, textoBotao, children }: Props) {
  const [estado, formAction, pendente] = useActionState<FormState, FormData>(action, null)

  const erros = (estado && !estado.ok && estado.fieldErrors) || {}
  const erroGeral = estado && !estado.ok && !estado.fieldErrors ? estado.message : null
  const sucesso = estado?.ok ? estado.data?.message : null

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {erroGeral && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-despesa/30 bg-despesa/10 px-3.5 py-3 text-sm text-despesa"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {erroGeral}
        </p>
      )}
      {sucesso && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-receita/30 bg-receita/10 px-3.5 py-3 text-sm text-receita"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          {sucesso}
        </p>
      )}

      {children({ erros, pendente })}

      <Button type="submit" bloco carregando={pendente}>
        {textoBotao}
      </Button>
    </form>
  )
}
