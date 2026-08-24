'use client'

import { updatePasswordAction } from '@/server/actions/auth'
import { AuthForm } from '@/components/AuthForm'
import { Field } from '@/components/ui/Field'

export function FormRedefinirSenha() {
  return (
    <AuthForm action={updatePasswordAction} textoBotao="Salvar nova senha">
      {({ erros }) => (
        <>
          <Field label="Nova senha" htmlFor="senha" erro={erros.senha} dica="Mínimo de 8 caracteres.">
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              enterKeyHint="next"
              required
              minLength={8}
              className="campo"
            />
          </Field>
          <Field label="Repita a nova senha" htmlFor="confirmacao" erro={erros.confirmacao}>
            <input
              id="confirmacao"
              name="confirmacao"
              type="password"
              autoComplete="new-password"
              enterKeyHint="go"
              required
              minLength={8}
              className="campo"
            />
          </Field>
        </>
      )}
    </AuthForm>
  )
}
