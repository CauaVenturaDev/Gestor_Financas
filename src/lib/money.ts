/**
 * Dinheiro (RN22). Centavos inteiros do começo ao fim.
 * Nenhum cálculo em float: parse na entrada, aritmética inteira, formatação só na borda.
 */

export const MAX_CENTS = 1_000_000_000 // R$ 10 milhões (premissa 18)

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** 123456 -> "R$ 1.234,56" */
export function formatBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  return brl.format(cents / 100)
}

/** 123456 -> "1.234,56" (sem o símbolo, para dentro de inputs) */
export function formatAmount(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  const neg = cents < 0
  const s = Math.abs(cents).toString().padStart(3, '0')
  const int = s.slice(0, -2)
  const dec = s.slice(-2)
  return `${neg ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}

/** Para eixos e rótulos apertados no celular: "R$ 1,2 mil" */
export function formatCompactBRL(cents: number): string {
  return brlCompact.format(cents / 100)
}

/**
 * "1.234,56" | "1234,56" | "1234.56" | "1234" -> 123456
 * Retorna null quando não há dígito nenhum.
 */
export function parseAmount(input: string): number | null {
  const raw = input.trim()
  if (!raw) return null

  const negative = /^-/.test(raw)
  const digitsOnly = raw.replace(/[^\d.,]/g, '')
  if (!digitsOnly.replace(/[.,]/g, '')) return null

  const lastComma = digitsOnly.lastIndexOf(',')
  const lastDot = digitsOnly.lastIndexOf('.')
  const sepIndex = Math.max(lastComma, lastDot)

  let intPart: string
  let decPart: string

  // Só é separador decimal se restarem no máximo 2 dígitos depois dele.
  if (sepIndex >= 0 && digitsOnly.length - sepIndex - 1 <= 2 && digitsOnly.length - sepIndex - 1 > 0) {
    intPart = digitsOnly.slice(0, sepIndex).replace(/[.,]/g, '')
    decPart = digitsOnly.slice(sepIndex + 1).replace(/[.,]/g, '')
  } else {
    intPart = digitsOnly.replace(/[.,]/g, '')
    decPart = ''
  }

  const cents = Number(intPart || '0') * 100 + Number(decPart.padEnd(2, '0').slice(0, 2) || '0')
  if (!Number.isFinite(cents)) return null
  return negative ? -cents : cents
}

/**
 * Máscara de digitação do campo de valor: o usuário digita dígitos e o valor
 * enche da direita para a esquerda, como em terminal de cartão.
 */
export function maskAmountTyping(input: string): { text: string; cents: number } {
  const digits = input.replace(/\D/g, '').slice(0, 12)
  const cents = Number(digits || '0')
  return { text: digits ? formatAmount(cents) : '', cents }
}
