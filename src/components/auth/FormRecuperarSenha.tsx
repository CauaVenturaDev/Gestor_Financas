'use client'

import { requestPasswordResetAction } from '@/server/actions/auth'
import { AuthForm } from '@/components/AuthForm'
import { Field } from '@/components/ui/Field'

export function FormRecuperarSenha() {
  return (
    <AuthForm action={requestPasswordResetAction} textoBotao="Enviar link">
      {({ erros }) => (
        <Field label="E-mail" htmlFor="email" erro={erros.email}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="go"
            required
            className="campo"
            placeholder="voce@exemplo.com"
          />
        </Field>
      )}
    </AuthForm>
  )
}
