'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

const CLASSES = `fixed right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-brand px-5
  text-brand-ink shadow-xl shadow-brand/25 transition-transform active:scale-95`

// acima da barra inferior e sempre acima da barra de gestos do iPhone
const POSICAO = { bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 1rem)' }

/** Botão de ação principal, alinhado à direita. */
export function Fab({ onClick, rotulo }: { onClick: () => void; rotulo: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={rotulo} className={CLASSES} style={POSICAO}>
      <Plus size={22} strokeWidth={2.5} />
      <span className="text-[15px] font-semibold">{rotulo}</span>
    </button>
  )
}

export function FabLink({ href, rotulo }: { href: string; rotulo: string }) {
  return (
    <Link href={href} aria-label={rotulo} className={CLASSES} style={POSICAO}>
      <Plus size={22} strokeWidth={2.5} />
      <span className="text-[15px] font-semibold">{rotulo}</span>
    </Link>
  )
}
