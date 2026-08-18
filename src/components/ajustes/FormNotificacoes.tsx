'use client'

import { useState, useTransition } from 'react'
import { Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { updateNotificationPrefs } from '@/server/actions/preferences'

interface Props {
  email: string
  notifyEmail: boolean
  notifyTime: string
  notifyDaysBefore: number
}

/**
 * Provisória: guarda as preferências que a Agenda de compromissos vai usar
 * quando o envio entrar no ar. Nada é enviado ainda, e a tela diz isso.
 */
export function FormNotificacoes({ email, ...inicial }: Props) {
  const toast = useToast()
  const [ativo, setAtivo] = useState(inicial.notifyEmail)
  const [horario, setHorario] = useState(inicial.notifyTime.slice(0, 5))
  const [dias, setDias] = useState(String(inicial.notifyDaysBefore))
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, iniciar] = useTransition()

  const salvar = () =>
    iniciar(async () => {
      setErros({})
      const res = await updateNotificationPrefs({
        notifyEmail: ativo,
        notifyTime: horario,
        notifyDaysBefore: Number(dias),
      })
      if (!res.ok) {
        setErros(res.fieldErrors ?? {})
        toast.erro(res.message)
        return
      }
      toast.sucesso('Preferências salvas.')
    })

  return (
    <div className="space-y-4">
      <div className="card p-3.5">
        <label className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-medium">Avisos por e-mail</span>
            <span className="block truncate text-sm text-muted">{email}</span>
          </span>
          <input
            type="checkbox"
            className="h-6 w-11 shrink-0 appearance-none rounded-full bg-line
                       transition-colors checked:bg-brand
                       before:block before:h-5 before:w-5 before:translate-x-0.5
                       before:translate-y-0.5 before:rounded-full before:bg-white
                       before:transition-transform checked:before:translate-x-[1.375rem]"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
        </label>
      </div>

      <div className={ativo ? 'space-y-4' : 'space-y-4 opacity-50'}>
        <Field
          label="Avisar com antecedência de"
          htmlFor="nt-dias"
          erro={erros.notifyDaysBefore}
          dica="Zero avisa no próprio dia do vencimento."
        >
          <div className="flex items-center gap-2">
            <input
              id="nt-dias"
              type="text"
              inputMode="numeric"
              className="campo tabular w-24"
              value={dias}
              disabled={!ativo}
              onChange={(e) => setDias(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
            <span className="text-muted">dia(s)</span>
          </div>
        </Field>

        <Field label="Horário do aviso" htmlFor="nt-hora" erro={erros.notifyTime}>
          <div className="relative">
            <Clock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              id="nt-hora"
              type="time"
              className="campo pl-9"
              value={horario}
              disabled={!ativo}
              onChange={(e) => setHorario(e.target.value)}
            />
          </div>
        </Field>
      </div>

      <Button bloco carregando={salvando} onClick={salvar}>
        Salvar preferências
      </Button>

      <div className="card flex gap-3 p-3.5">
        <Mail size={19} className="mt-0.5 shrink-0 text-faint" />
        <p className="text-sm leading-relaxed text-muted">
          <strong className="text-ink">Ainda não sai e-mail nenhum.</strong> Estas preferências
          ficam guardadas e passam a valer quando a aba <strong className="text-ink">Agenda</strong>{' '}
          entrar no ar — é ela que traz os compromissos a pagar e a receber com lembrete e
          adiamento. Elas serão o padrão de cada compromisso novo, e cada um poderá ter o seu.
        </p>
      </div>
    </div>
  )
}
