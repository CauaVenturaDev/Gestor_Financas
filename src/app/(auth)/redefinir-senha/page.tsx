import Link from 'next/link'
import type { Metadata } from 'next'
import { FormRedefinirSenha } from '@/components/auth/FormRedefinirSenha'
import { getUser } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Redefinir senha' }

export default async function RedefinirSenhaPage() {
  const user = await getUser()

  if (!user) {
    return (
      <>
        <h1 className="text-2xl font-semibold">Link inválido ou expirado</h1>
        <p className="mb-6 mt-1 text-muted">
          Abra o app pelo link mais recente que enviamos, ou peça um novo.
        </p>
        <Link href="/recuperar-senha" className="text-brand underline underline-offset-4">
          Pedir um novo link
        </Link>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Nova senha</h1>
      <p className="mb-6 mt-1 text-muted">
        Ao salvar, as outras sessões abertas são desconectadas.
      </p>

      <FormRedefinirSenha />
    </>
  )
}
