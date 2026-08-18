'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { COR_DE_FUNDO, TEMAS, type TemaId } from '@/lib/theme'
import { setTheme } from '@/server/actions/preferences'

const GRUPOS = [
  { familia: 'auto', titulo: 'Automático' },
  { familia: 'claro', titulo: 'Claros' },
  { familia: 'escuro', titulo: 'Escuros' },
] as const

/**
 * A troca é aplicada no atributo do documento na hora do toque; a gravação do
 * cookie vem depois. Assim a mudança é instantânea mesmo com rede ruim.
 */
export function SeletorTema({ atual }: { atual: TemaId }) {
  const [escolhido, setEscolhido] = useState<TemaId>(atual)
  const [, iniciar] = useTransition()

  const aplicar = (tema: TemaId) => {
    setEscolhido(tema)

    const raiz = document.documentElement
    if (tema === 'sistema') raiz.removeAttribute('data-theme')
    else raiz.setAttribute('data-theme', tema)

    // a barra de status do iOS em standalone acompanha o tema
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', COR_DE_FUNDO[tema])

    iniciar(() => {
      void setTheme(tema)
    })
  }

  return (
    <div className="space-y-5">
      {GRUPOS.map((g) => (
        <section key={g.familia}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
            {g.titulo}
          </h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {TEMAS.filter((t) => t.familia === g.familia).map((t) => {
              const ativo = escolhido === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => aplicar(t.id)}
                    aria-pressed={ativo}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/40"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-line"
                    >
                      {t.amostra.map((cor, i) => (
                        <span key={i} className="flex-1" style={{ background: cor }} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t.nome}</span>
                      <span className="block text-sm text-muted">{t.descricao}</span>
                    </span>
                    {ativo && (
                      <Check size={20} className="shrink-0 text-brand" aria-label="Em uso" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
