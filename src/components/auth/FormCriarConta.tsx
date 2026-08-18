'use client'

import { signUpAction } from '@/server/actions/auth'
import { AuthForm } from '@/components/AuthForm'
import { Field } from '@/components/ui/Field'

export function FormCriarConta() {
  return (
    <AuthForm action={signUpAction} textoBotao="Criar conta">
      {({ erros }) => (
        <>
          <Field label="Nome" htmlFor="nome" erro={erros.nome}>
            <input
              id="nome"
              name="nome"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              required
              className="campo"
              placeholder="Como quer ser chamado"
            />
          </Field>
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
          <Field label="Senha" htmlFor="senha" erro={erros.senha} dica="Mínimo de 8 caracteres.">
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              enterKeyHint="go"
              required
              minLength={8}
              className="campo"
              placeholder="••••••••"
            />
          </Field>
        </>
      )}
    </AuthForm>
  )
}
