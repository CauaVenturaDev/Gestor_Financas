import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { BackButton } from '@/components/BackButton'
import { TelaConta } from '@/components/conta/TelaConta'
import { getProfile } from '@/server/queries'

export const metadata: Metadata = { title: 'Conta' }

export default async function ContaPage() {
  const dados = await getProfile()
  if (!dados) redirect('/entrar')

  const nome =
    dados.profile?.display_name ??
    (dados.user.user_metadata?.display_name as string | undefined) ??
    ''

  return (
    <div className="space-y-4 px-4 pt-3">
      <header className="space-y-3 pt-safe">
        <BackButton href="/app/movimentacoes" rotulo="Movimentações" />
        <h1 className="text-xl font-semibold">Conta</h1>
      </header>

      <TelaConta nome={nome} email={dados.user.email ?? ''} />
    </div>
  )
}
