'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo'
type Tamanho = 'md' | 'sm'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanho?: Tamanho
  carregando?: boolean
  bloco?: boolean
}

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-brand text-brand-ink active:bg-brand/85 disabled:bg-brand/50',
  secundario: 'border border-line bg-surface text-ink active:bg-line/40',
  fantasma: 'text-muted active:bg-line/40',
  perigo: 'bg-despesa text-white active:bg-despesa/85',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variante = 'primario', tamanho = 'md', carregando, bloco, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      {...props}
      disabled={props.disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-colors disabled:cursor-not-allowed disabled:opacity-60
        ${tamanho === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-[15px]'}
        ${bloco ? 'w-full' : ''} ${VARIANTES[variante]} ${className}`}
      style={{ minHeight: tamanho === 'sm' ? 40 : 48 }}
    >
      {carregando && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
})
