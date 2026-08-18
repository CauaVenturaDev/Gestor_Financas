'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-despesa/10 text-despesa">
        <AlertTriangle size={28} />
      </span>
      <div>
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-1.5 text-muted">
          Nenhum dado foi perdido. Tente de novo em alguns segundos.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="toque rounded-xl bg-brand px-5 font-medium text-brand-ink"
      >
        Tentar de novo
      </button>
    </div>
  )
}
