'use client'

import { useEffect, useState } from 'react'
import { formatAmount, maskAmountTyping } from '@/lib/money'

interface Props {
  name?: string
  id?: string
  value: number | null
  onChange: (cents: number | null) => void
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  'aria-invalid'?: boolean
}

/**
 * Campo de dinheiro (RN22 e item 5 da seção 6.1).
 * inputmode="decimal" abre o teclado numérico no iPhone; a máscara enche da
 * direita para a esquerda, como terminal de cartão, e o estado é sempre centavos.
 */
export function MoneyInput({ value, onChange, name, id, placeholder = '0,00', ...rest }: Props) {
  const [texto, setTexto] = useState(() => formatAmount(value))

  useEffect(() => {
    // sincroniza quando o valor muda de fora (abrir modal de edição, por exemplo)
    setTexto((atual) => {
      const esperado = formatAmount(value)
      return atual.replace(/\D/g, '') === esperado.replace(/\D/g, '') ? atual : esperado
    })
  }, [value])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        R$
      </span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        className="campo tabular pl-10 text-right text-lg font-medium"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          const { text, cents } = maskAmountTyping(e.target.value)
          setTexto(text)
          onChange(text ? cents : null)
        }}
        {...rest}
      />
    </div>
  )
}
