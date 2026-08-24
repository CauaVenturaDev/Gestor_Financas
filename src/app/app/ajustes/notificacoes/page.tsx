import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { FormNotificacoes } from '@/components/ajustes/FormNotificacoes'
import { getProfile } from '@/server/queries'

export const metadata: Metadata = { title: 'Notificações' }

export default async function NotificacoesPage() {
  const dados = await getProfile()
  if (!dados) redirect('/entrar')

  return (
    <FormNotificacoes
      email={dados.user.email ?? ''}
      notifyEmail={dados.profile?.notify_email ?? true}
      notifyTime={dados.profile?.notify_time ?? '09:00'}
      notifyDaysBefore={dados.profile?.notify_days_before ?? 1}
    />
  )
}
