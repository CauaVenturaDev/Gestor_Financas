import { addMonthsToDate } from '@/lib/date'

export interface InstallmentPreview {
  number: number
  dueDate: string
  amountCents: number
  bornPaid: boolean
}

/**
 * Espelho em TypeScript do motor de parcelamento (RN15, RN16, RN18), usado só
 * para a pré-visualização instantânea no formulário. A gravação é feita pela
 * função `create_purchase` no banco, que é a fonte da verdade e roda numa
 * única transação.
 *
 * RN15: base = floor(total / n); resto na primeira parcela. A soma sempre fecha.
 * RN16: parcela k vence em first_due + (k-1) meses, com clamp de dia.
 * RN18: parcelas anteriores à atual nascem pagas, com paid_at = vencimento.
 */
export function previewInstallments(params: {
  totalCents: number
  count: number
  currentNumber?: number
  currentDueDate: string
}): InstallmentPreview[] {
  const { totalCents, count, currentDueDate } = params
  const currentNumber = params.currentNumber ?? 1

  if (!Number.isInteger(totalCents) || totalCents <= 0) return []
  if (!Number.isInteger(count) || count < 1 || count > 48) return []
  if (currentNumber < 1 || currentNumber > count) return []

  const firstDue = addMonthsToDate(currentDueDate, -(currentNumber - 1))
  const base = Math.floor(totalCents / count)
  const resto = totalCents - base * count

  return Array.from({ length: count }, (_, i) => {
    const k = i + 1
    return {
      number: k,
      dueDate: addMonthsToDate(firstDue, k - 1),
      amountCents: base + (k === 1 ? resto : 0),
      bornPaid: k < currentNumber,
    }
  })
}
