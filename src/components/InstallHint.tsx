'use client'

import { useEffect, useState } from 'react'
import { Share, X } from 'lucide-react'

const CHAVE = 'gf:dica-instalar'

/**
 * Item 11 da seção 6.1: no iOS instalar é Compartilhar > Adicionar à Tela de
 * Início. A dica aparece uma única vez e é dispensável.
 */
export function InstallHint() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(CHAVE)) return

    const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const jaInstalado =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true

    if (ehIOS && !jaInstalado) {
      const t = setTimeout(() => setVisivel(true), 2500)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visivel) return null

  const dispensar = () => {
    localStorage.setItem(CHAVE, '1')
    setVisivel(false)
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] z-40 sm:hidden">
      <div className="flex animate-pop-in items-start gap-3 rounded-2xl border border-line bg-elevated p-3.5 shadow-xl">
        <span className="mt-0.5 shrink-0 text-brand">
          <Share size={20} />
        </span>
        <p className="flex-1 text-sm leading-snug">
          Instale na tela de início: toque em <strong>Compartilhar</strong> e depois em{' '}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar dica de instalação"
          className="toque -mr-2 -mt-2 shrink-0 rounded-full text-muted"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
