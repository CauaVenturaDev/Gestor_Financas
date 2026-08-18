import type { PostgrestError } from '@supabase/supabase-js'

export type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RULE_VIOLATION'
  | 'RATE_LIMIT'
  | 'AUTH'
  | 'UNKNOWN'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string> }

export function ok(): ActionResult<void>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data: data as T }
}

export function fail(
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, code, message, fieldErrors }
}

/** Traduz o erro do Postgres para o contrato da camada de dados (seção 7). */
export function fromPostgrest(error: PostgrestError): ActionResult<never> {
  switch (error.code) {
    case '23505':
      return fail('CONFLICT', mensagemDeUnicidade(error.message))
    case '23503':
      return fail('VALIDATION', 'Referência inválida: o item apontado não existe.')
    case '23514':
      return fail('RULE_VIOLATION', mensagemDeCheck(error.message))
    case '42501':
      return fail('AUTH', 'Sua sessão expirou. Entre de novo.')
    case 'P0001':
      return fail('RULE_VIOLATION', error.message)
    case 'P0002':
      return fail('NOT_FOUND', 'Item não encontrado.')
    case 'PGRST116':
      return fail('NOT_FOUND', 'Item não encontrado.')
    default:
      return fail('UNKNOWN', error.message || 'Não foi possível concluir a operação.')
  }
}

function mensagemDeUnicidade(raw: string): string {
  if (raw.includes('categories_name_uniq')) return 'Já existe uma categoria com esse nome nessa natureza.'
  if (raw.includes('banks_name_uniq')) return 'Já existe um banco com esse nome.'
  if (raw.includes('tx_occurrence_uniq')) return 'Essa ocorrência do mês já existe.'
  return 'Esse registro já existe.'
}

function mensagemDeCheck(raw: string): string {
  if (raw.includes('amount_cents')) return 'O valor precisa ser maior que zero.'
  if (raw.includes('installments_count')) return 'A quantidade de parcelas precisa estar entre 1 e 48.'
  if (raw.includes('day_of_month')) return 'O dia do vencimento precisa estar entre 1 e 31.'
  if (raw.includes('end_date')) return 'A data de fim não pode ser anterior à de início.'
  if (raw.includes('char_length')) return 'O nome tem tamanho inválido.'
  return 'Os dados enviados não passam nas regras do sistema.'
}
