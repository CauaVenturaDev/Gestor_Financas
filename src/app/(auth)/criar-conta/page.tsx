import Link from 'next/link'
import type { Metadata } from 'next'
import { FormCriarConta } from '@/components/auth/FormCriarConta'

export const metadata: Metadata = { title: 'Criar conta' }

export default function CriarContaPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Criar conta</h1>
      <p className="mb-6 mt-1 text-muted">
        Sua conta já nasce com as categorias padrão de receita, despesa e investimento.
      </p>

      <FormCriarConta />

      <p className="mt-6 text-sm text-muted">
        Já tem conta?{' '}
        <Link href="/entrar" className="text-brand underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </>
  )
}
