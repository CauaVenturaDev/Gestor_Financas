import { z } from 'zod'
import { MAX_CENTS } from '@/lib/money'
import { MIN_DATE, isValidISODate, isValidYm, maxDate } from '@/lib/date'

/** Validações mínimas da RN25. A RLS é a última barreira, nunca a única. */

const isoDate = z
  .string()
  .refine(isValidISODate, 'Data inválida.')
  .refine((d) => d >= MIN_DATE, `A data não pode ser anterior a ${MIN_DATE}.`)
  .refine((d) => d <= maxDate(), 'A data está longe demais no futuro.')

const ym = z.string().refine(isValidYm, 'Mês inválido.')

const amount = z
  .number()
  .int('O valor precisa ser um número inteiro de centavos.')
  .positive('O valor precisa ser maior que zero.')
  .max(MAX_CENTS, 'O valor máximo por lançamento é R$ 10.000.000,00.')

const nome = z.string().trim().min(1, 'Informe um nome.').max(120, 'Máximo de 120 caracteres.')
const nomeCurto = z.string().trim().min(1, 'Informe um nome.').max(60, 'Máximo de 60 caracteres.')
const observacao = z.string().trim().max(500, 'Máximo de 500 caracteres.').optional().nullable()
const uuid = z.string().uuid('Identificador inválido.')

export const kindSchema = z.enum(['receita', 'despesa', 'aporte', 'resgate'])
export const natureSchema = z.enum(['receita', 'despesa', 'investimento'])

export const createTransactionSchema = z.object({
  kind: kindSchema,
  name: nome,
  date: isoDate,
  amountCents: amount,
  categoryId: uuid.nullable().optional(),
  note: observacao,
})

export const updateTransactionSchema = z.object({
  id: uuid,
  name: nome,
  date: isoDate,
  amountCents: amount,
  categoryId: uuid.nullable().optional(),
  note: observacao,
  scope: z.enum(['apenas_esta', 'esta_e_futuras']).default('apenas_esta'),
})

export const confirmOccurrenceSchema = z.object({
  id: uuid,
  amountCents: amount,
  date: isoDate.optional(),
})

const recurrenceBase = z.object({
  kind: z.enum(['receita', 'despesa']),
  name: nome,
  categoryId: uuid.nullable().optional(),
  amountCents: amount.nullable(),
  dayOfMonth: z.number().int().min(1, 'Dia entre 1 e 31.').max(31, 'Dia entre 1 e 31.'),
  startYm: ym,
  endYm: ym.nullable().optional(),
  note: observacao,
  autoConfirm: z.boolean().default(true),
})

const periodoCoerente = (v: { startYm: string; endYm?: string | null }) =>
  !v.endYm || v.endYm >= v.startYm

export const createRecurrenceSchema = recurrenceBase.refine(periodoCoerente, {
  message: 'O fim não pode ser anterior ao início.',
  path: ['endYm'],
})

export const updateRecurrenceSchema = recurrenceBase
  .extend({ id: uuid })
  .refine(periodoCoerente, {
    message: 'O fim não pode ser anterior ao início.',
    path: ['endYm'],
  })

export const categorySchema = z.object({
  nature: natureSchema,
  name: nomeCurto,
})

export const bankSchema = z.object({ name: nomeCurto })

export const createPurchaseSchema = z
  .object({
    bankId: uuid,
    purchaseDate: isoDate,
    description: z.string().trim().min(1, 'Informe a descrição.').max(160, 'Máximo de 160 caracteres.'),
    totalCents: amount,
    count: z.number().int().min(1, 'Entre 1 e 48 parcelas.').max(48, 'Entre 1 e 48 parcelas.'),
    currentNumber: z.number().int().min(1).max(48).default(1),
    currentDueDate: isoDate,
  })
  .refine((v) => v.currentNumber <= v.count, {
    message: 'A parcela atual não pode ser maior que a quantidade.',
    path: ['currentNumber'],
  })

export const emailSchema = z.string().trim().toLowerCase().email('E-mail inválido.')
export const passwordSchema = z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.')

/** Converte o erro do zod no formato { campo: mensagem } do contrato. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = issue.message
  }
  return out
}
