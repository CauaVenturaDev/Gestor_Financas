import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
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

  return <TelaConta nome={nome} email={dados.user.email ?? ''} />
}
