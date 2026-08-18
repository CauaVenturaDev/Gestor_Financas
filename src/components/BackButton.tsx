'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

/**
 * Item 12 da seção 6.1: em standalone não existe o botão de voltar do
 * navegador, então toda tela interna precisa do seu próprio.
 */
export function BackButton({ href, rotulo = 'Voltar' }: { href: string; rotulo?: string }) {
  return (
    <Link
      href={href}
      className="toque -ml-2 gap-0.5 rounded-xl pr-3 text-sm font-medium text-muted active:bg-line/40"
    >
      <ChevronLeft size={20} />
      {rotulo}
    </Link>
  )
}
