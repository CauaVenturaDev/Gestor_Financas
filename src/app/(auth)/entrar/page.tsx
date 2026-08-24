import Link from 'next/link'
import type { Metadata } from 'next'
import { FormEntrar } from '@/components/auth/FormEntrar'

export const metadata: Metadata = { title: 'Entrar' }

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; conta?: string }>
}) {
  const { proximo, conta } = await searchParams

  return (
    <>
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <p className="mb-6 mt-1 text-muted">Acesse sua conta para ver o mês.</p>

      {conta === 'excluida' && (
        <p className="mb-4 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-muted">
          Sua conta foi excluída e todos os dados foram apagados.
        </p>
      )}

      <FormEntrar proximo={proximo ?? '/app/relatorio'} />

      <div className="mt-6 space-y-2 text-sm">
        <p>
          <Link href="/recuperar-senha" className="text-brand underline underline-offset-4">
            Esqueci minha senha
          </Link>
        </p>
        <p className="text-muted">
          Ainda não tem conta?{' '}
          <Link href="/criar-conta" className="text-brand underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      </div>
    </>
  )
}
