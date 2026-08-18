import Link from 'next/link'
import type { Metadata } from 'next'
import { FormRecuperarSenha } from '@/components/auth/FormRecuperarSenha'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function RecuperarSenhaPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Recuperar senha</h1>
      <p className="mb-6 mt-1 text-muted">
        Informe o e-mail da conta. Enviamos um link para você definir uma senha nova.
      </p>

      <FormRecuperarSenha />

      <p className="mt-6 text-sm text-muted">
        <Link href="/entrar" className="text-brand underline underline-offset-4">
          Voltar para entrar
        </Link>
      </p>
    </>
  )
}
