'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type Tipo = 'sucesso' | 'erro' | 'info'
interface Aviso {
  id: number
  tipo: Tipo
  texto: string
}

const Ctx = createContext<{
  sucesso: (t: string) => void
  erro: (t: string) => void
  info: (t: string) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const push = useCallback((tipo: Tipo, texto: string) => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, tipo, texto }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'erro' ? 7000 : 4000)
  }, [])

  const api = useMemo(
    () => ({
      sucesso: (t: string) => push('sucesso', t),
      erro: (t: string) => push('erro', t),
      info: (t: string) => push('info', t),
    }),
    [push],
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-3 pt-safe"
      >
        <div className="mt-2 flex w-full max-w-md flex-col gap-2">
          {avisos.map((a) => (
            <div
              key={a.id}
              className={`pointer-events-auto flex animate-pop-in items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-sm shadow-lg ${
                a.tipo === 'erro'
                  ? 'border-despesa/30 bg-despesa/10 text-despesa'
                  : a.tipo === 'sucesso'
                    ? 'border-receita/30 bg-receita/10 text-receita'
                    : 'border-line bg-elevated text-ink'
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {a.tipo === 'erro' ? (
                  <AlertCircle size={18} />
                ) : a.tipo === 'sucesso' ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Info size={18} />
                )}
              </span>
              <p className="flex-1 leading-snug">{a.texto}</p>
              <button
                type="button"
                aria-label="Fechar aviso"
                onClick={() => setAvisos((x) => x.filter((y) => y.id !== a.id))}
                className="shrink-0 opacity-60 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast precisa estar dentro de ToastProvider')
  return ctx
}
