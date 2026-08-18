import { redirect } from 'next/navigation'
import { TabBar, TopNav } from '@/components/TabBar'
import { AppRefresher } from '@/components/AppRefresher'
import { InstallHint } from '@/components/InstallHint'
import { getProfile } from '@/server/queries'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const dados = await getProfile()
  if (!dados) redirect('/entrar')

  const nome =
    dados.profile?.display_name ??
    (dados.user.user_metadata?.display_name as string | undefined) ??
    null

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
