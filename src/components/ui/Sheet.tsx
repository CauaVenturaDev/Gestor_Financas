'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: string
  children: React.ReactNode
  rodape?: React.ReactNode
  larguraDesktop?: 'md' | 'lg'
}

/**
 * No celular: painel deslizante de baixo para cima, com barra de arrastar,
 * altura máxima de 90% da viewport e rodapé fixo acima da safe area.
 * No desktop: o mesmo componente vira diálogo central.
 *
 * Trata o item 6 da seção 6.1: o iOS não redimensiona a viewport ao abrir o
 * teclado, ele desloca a página. A API visualViewport devolve a altura real
 * visível, e o painel sobe junto para o botão de salvar continuar alcançável.
 */
export function Sheet({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  larguraDesktop = 'md',
}: Props) {
  const [montado, setMontado] = useState(false)
  const [teclado, setTeclado] = useState(0)
  const painelRef = useRef<HTMLDivElement>(null)
  const tituloId = useRef(`sheet-${Math.random().toString(36).slice(2)}`)

  useEffect(() => setMontado(true), [])

  // trava a rolagem do fundo enquanto o painel está aberto
  useEffect(() => {
    if (!aberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [aberto])

  // Esc fecha; foco inicial dentro do painel
  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      const alvo = painelRef.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]), select, textarea, button',
      )
      alvo?.focus({ preventScroll: true })
    }, 60)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [aberto, aoFechar])

  // acompanha o teclado do iOS
  useEffect(() => {
    if (!aberto) return
    const vv = window.visualViewport
    if (!vv) return

    const medir = () => {
      const altura = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setTeclado(altura > 80 ? altura : 0)
    }
    medir()
    vv.addEventListener('resize', medir)
    vv.addEventListener('scroll', medir)
    return () => {
      vv.removeEventListener('resize', medir)
      vv.removeEventListener('scroll', medir)
      setTeclado(0)
    }
  }, [aberto])

  // rola o campo focado para dentro da área visível
  useEffect(() => {
    if (!aberto) return
    const onFocus = (e: FocusEvent) => {
      const alvo = e.target as HTMLElement | null
      if (!alvo?.matches?.('input, select, textarea')) return
      setTimeout(() => alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 220)
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [aberto])

  if (!montado || !aberto) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-black/45"
        onClick={aoFechar}
        aria-hidden="true"
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId.current}
        style={{
          transform: teclado ? `translateY(-${teclado}px)` : undefined,
          maxHeight: teclado ? `calc(90dvh - ${teclado}px)` : undefined,
        }}
        className={`relative flex max-h-[90dvh] w-full flex-col animate-sheet-up
          rounded-t-3xl border border-line bg-elevated shadow-2xl transition-transform
          sm:max-h-[85dvh] sm:animate-pop-in sm:rounded-3xl
          ${larguraDesktop === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        {/* barra de arrastar: afordância de painel no celular */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>

        <header className="flex items-start gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={tituloId.current} className="text-lg font-semibold leading-tight">
              {titulo}
            </h2>
            {descricao && <p className="mt-1 text-sm text-muted">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="toque -mr-2 -mt-1 shrink-0 rounded-full text-muted active:bg-line/50"
          >
            <X size={20} />
          </button>
        </header>

        <div className="rolagem flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {rodape && (
          <footer
            className="border-t border-line bg-elevated px-5 pt-3"
            style={{ paddingBottom: teclado ? 12 : 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            {rodape}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
