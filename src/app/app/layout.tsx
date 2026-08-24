import { redirect } from 'next/navigation'
import { TabBar, TopNav } from '@/components/TabBar'
import { AppRefresher } from '@/components/AppRefresher'
import { InstallHint } from '@/components/InstallHint'
import { getUser } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // O nome sai do metadata da sessão, que já veio junto com a autenticação.
  // Consultar profiles aqui custaria uma ida de rede a mais em toda navegação
  // que revalida o layout, e o nome é a única coisa que o cabeçalho usa.
  const user = await getUser()
  if (!user) redirect('/entrar')

  const nome = (user.user_metadata?.display_name as string | undefined) ?? null

  return (
    <div className="min-h-dvh px-safe">
      <AppRefresher />
      <TopNav nome={nome} />
      <main className="mx-auto w-full max-w-5xl pb-[calc(3.5rem+env(safe-area-inset-bottom)+4.5rem)] sm:pb-16">
        {children}
      </main>
      <TabBar />
      <InstallHint />
    </div>
  )
}
