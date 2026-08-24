import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'

export const metadata: Metadata = { title: 'Sem conexão' }

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-line/60 text-muted">
        <WifiOff size={28} />
      </span>
      <div>
        <h1 className="text-xl font-semibold">Sem conexão</h1>
        <p className="mt-1.5 text-muted">
          O app precisa de internet para mostrar seus números atualizados. Assim que a rede voltar,
          é só recarregar.
        </p>
      </div>
      <p className="text-sm text-faint">
        Nada que você tenha salvo se perdeu — os dados ficam no servidor.
      </p>
    </div>
  )
}
