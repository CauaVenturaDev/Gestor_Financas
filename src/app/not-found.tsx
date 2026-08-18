import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-line/60 text-muted">
        <FileQuestion size={28} />
      </span>
      <div>
        <h1 className="text-xl font-semibold">Não encontramos essa tela</h1>
        <p className="mt-1.5 text-muted">O endereço não existe ou o item foi excluído.</p>
      </div>
      <Link
        href="/app/movimentacoes"
        className="toque rounded-xl bg-brand px-5 font-medium text-brand-ink"
      >
        Ir para o mês
      </Link>
    </div>
  )
}
