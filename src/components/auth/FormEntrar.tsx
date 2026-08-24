'use client'

import { signInAction } from '@/server/actions/auth'
import { AuthForm } from '@/components/AuthForm'
import { Field } from '@/components/ui/Field'

export function FormEntrar({ proximo }: { proximo: string }) {
  return (
    <AuthForm action={signInAction} textoBotao="Entrar">
      {({ erros }) => (
        <>
          <input type="hidden" name="proximo" value={proximo} />
          <Field label="E-mail" htmlFor="email" erro={erros.email}>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="next"
              required
              className="campo"
              placeholder="voce@exemplo.com"
            />
          </Field>
          <Field label="Senha" htmlFor="senha" erro={erros.senha}>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              enterKeyHint="go"
              required
              className="campo"
              placeholder="••••••••"
            />
          </Field>
        </>
      )}
    </AuthForm>
  )
}
