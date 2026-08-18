import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { addMonthsToYm, currentYm, ymToFirstDay, ymToLastDay } from '@/lib/date'
import type {
  BankRow,
  CardInstallmentRow,
  CategoryRow,
  Kind,
  Nature,
  RecurrenceRow,
  TransactionRow,
  VCardInstallmentRow,
  VCardPurchaseRow,
} from '@/lib/database.types'

export interface Totais {
  receitas: number
  despesas: number
  aportes: number
  resgates: number
  lucro: number
  saldoMes: number
  saldoAcumulado: number
}

export interface MonthOverview {
  ym: string
  realizado: Totais
  projetado: Totais
  saldoAnterior: number
  patrimonio: number
  comprometidoCartao: number
}

const TOTAIS_ZERO: Totais = {
  receitas: 0, despesas: 0, aportes: 0, resgates: 0,
  lucro: 0, saldoMes: 0, saldoAcumulado: 0,
}

/**
 * Visão do mês. Garante antes as ocorrências recorrentes de M e M+1, para a
 * tela ficar consistente mesmo se o cron diário falhar (seção 5.1, caminho 1).
 */
export async function getMonthOverview(ym: string): Promise<MonthOverview> {
  const supabase = await createClient()

  await supabase.rpc('ensure_occurrences', {
    p_start_ym: ymToFirstDay(ym),
    p_end_ym: ymToFirstDay(addMonthsToYm(ym, 1)),
  })

  const { data, error } = await supabase.rpc('month_overview', { p_ym: ymToFirstDay(ym) })
  if (error || !data) {
    return { ym, realizado: TOTAIS_ZERO, projetado: TOTAIS_ZERO, saldoAnterior: 0, patrimonio: 0, comprometidoCartao: 0 }
  }
  return data as unknown as MonthOverview
}

export interface TxFilters {
  ym: string
  kind?: Kind
  categoryIds?: string[]
  q?: string
}

export interface TxItem extends TransactionRow {
  categoryName: string | null
}

/** Lista de lançamentos do mês. O filtro recorta a lista, nunca os cards. */
export async function listTransactions(f: TxFilters): Promise<TxItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    .gte('date', ymToFirstDay(f.ym))
    .lte('date', ymToLastDay(f.ym))
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(500)

  if (f.kind) query = query.eq('kind', f.kind)
  if (f.categoryIds?.length) query = query.in('category_id', f.categoryIds)
  if (f.q?.trim()) query = query.ilike('name', `%${sanitizeLike(f.q)}%`)

  const { data } = await query
  const rows = (data ?? []) as TransactionRow[]
  const nomes = await categoryNameMap()
  return rows.map((r) => ({ ...r, categoryName: r.category_id ? nomes.get(r.category_id) ?? null : null }))
}

/** Categorias em memória: no máximo 200 por usuário (premissa 12). */
async function categoryNameMap(): Promise<Map<string, string>> {
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('id, name').is('deleted_at', null)
  return new Map(((data ?? []) as Pick<CategoryRow, 'id' | 'name'>[]).map((c) => [c.id, c.name]))
}

export async function listCategories(opts?: {
  nature?: Nature
  includeArchived?: boolean
}): Promise<CategoryRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (opts?.nature) query = query.eq('nature', opts.nature)
  if (!opts?.includeArchived) query = query.eq('is_archived', false)

  const { data } = await query
  return (data ?? []) as CategoryRow[]
}

/** Contagem de lançamentos por categoria, para a tela de categorias. */
export async function countTransactionsByCategory(): Promise<Map<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('transactions')
    .select('category_id')
    .is('deleted_at', null)
    .not('category_id', 'is', null)
    .limit(50000)

  const out = new Map<string, number>()
  for (const r of (data ?? []) as { category_id: string }[]) {
    out.set(r.category_id, (out.get(r.category_id) ?? 0) + 1)
  }
  return out
}

export interface RuleItem extends RecurrenceRow {
  categoryName: string | null
  nextOccurrence: string | null
}

export async function listRecurrences(): Promise<RuleItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recurrences')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as RecurrenceRow[]
  if (rows.length === 0) return []

  const nomes = await categoryNameMap()
  const { data: prox } = await supabase
    .from('transactions')
    .select('recurrence_id, date')
    .is('deleted_at', null)
    .eq('status', 'previsto')
    .in('recurrence_id', rows.map((r) => r.id))
    .order('date', { ascending: true })

  const proxMap = new Map<string, string>()
  for (const p of (prox ?? []) as { recurrence_id: string; date: string }[]) {
    if (!proxMap.has(p.recurrence_id)) proxMap.set(p.recurrence_id, p.date)
  }

  return rows.map((r) => ({
    ...r,
    categoryName: r.category_id ? nomes.get(r.category_id) ?? null : null,
    nextOccurrence: proxMap.get(r.id) ?? null,
  }))
}

export interface PatrimonioMes {
  ym: string
  aportes: number
  resgates: number
  liquido: number
  acumulado: number
}

export async function getPatrimonio(): Promise<{ totalCents: number; meses: PatrimonioMes[] }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('patrimonio_mensal')
  if (error || !data) return { totalCents: 0, meses: [] }
  return data as unknown as { totalCents: number; meses: PatrimonioMes[] }
}

export async function listBanks(includeArchived = false): Promise<BankRow[]> {
  const supabase = await createClient()
  let query = supabase.from('banks').select('*').is('deleted_at', null).order('name')
  if (!includeArchived) query = query.eq('is_archived', false)
  const { data } = await query
  return (data ?? []) as BankRow[]
}

export interface PurchaseItem extends VCardPurchaseRow {
  bankName: string
}

export async function listPurchases(f?: {
  bankId?: string
  status?: string
  ym?: string
  q?: string
}): Promise<PurchaseItem[]> {
  const supabase = await createClient()
  let query = supabase.from('v_card_purchases').select('*').order('purchase_date', { ascending: false }).limit(300)
  if (f?.bankId) query = query.eq('bank_id', f.bankId)
  if (f?.q?.trim()) query = query.ilike('description', `%${sanitizeLike(f.q)}%`)

  const { data } = await query
  let rows = (data ?? []) as VCardPurchaseRow[]
  if (f?.status) rows = rows.filter((r) => r.status === f.status)

  const bancos = new Map((await listBanks(true)).map((b) => [b.id, b.name]))
  return rows.map((r) => ({ ...r, bankName: bancos.get(r.bank_id) ?? '—' }))
}

export async function getPurchase(id: string): Promise<{
  purchase: PurchaseItem
  installments: VCardInstallmentRow[]
} | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('v_card_purchases').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const purchase = data as VCardPurchaseRow

  const { data: inst } = await supabase
    .from('v_card_installments')
    .select('*')
    .eq('purchase_id', id)
    .order('number')

  const bancos = new Map((await listBanks(true)).map((b) => [b.id, b.name]))
  return {
    purchase: { ...purchase, bankName: bancos.get(purchase.bank_id) ?? '—' },
    installments: (inst ?? []) as VCardInstallmentRow[],
  }
}

export interface InvoiceItem extends VCardInstallmentRow {
  description: string
  bankId: string
  bankName: string
  installmentsCount: number
}

/** Fatura do mês (RN19): parcelas com vencimento dentro de M. */
export async function listInvoice(f: {
  ym: string
  bankId?: string
  status?: string
  q?: string
}): Promise<{ totalCents: number; paidCents: number; items: InvoiceItem[] }> {
  const supabase = await createClient()

  const { data: inst } = await supabase
    .from('v_card_installments')
    .select('*')
    .gte('due_date', ymToFirstDay(f.ym))
    .lte('due_date', ymToLastDay(f.ym))
    .order('due_date')
    .limit(1000)

  const parcelas = (inst ?? []) as VCardInstallmentRow[]
  if (parcelas.length === 0) return { totalCents: 0, paidCents: 0, items: [] }

  const { data: compras } = await supabase
    .from('card_purchases')
    .select('id, bank_id, description, installments_count')
    .in('id', [...new Set(parcelas.map((p) => p.purchase_id))])

  const compraMap = new Map(
    ((compras ?? []) as Pick<
      import('@/lib/database.types').CardPurchaseRow,
      'id' | 'bank_id' | 'description' | 'installments_count'
    >[]).map((c) => [c.id, c]),
  )
  const bancos = new Map((await listBanks(true)).map((b) => [b.id, b.name]))

  let items: InvoiceItem[] = parcelas.flatMap((p) => {
    const c = compraMap.get(p.purchase_id)
    if (!c) return []
    return [{
      ...p,
      description: c.description,
      bankId: c.bank_id,
      bankName: bancos.get(c.bank_id) ?? '—',
      installmentsCount: c.installments_count,
    }]
  })

  if (f.bankId) items = items.filter((i) => i.bankId === f.bankId)
  const totalCents = items.reduce((s, i) => s + i.amount_cents, 0)
  const paidCents = items.filter((i) => i.paid_at).reduce((s, i) => s + i.amount_cents, 0)

  if (f.status) items = items.filter((i) => i.status === f.status)
  if (f.q?.trim()) {
    const needle = f.q.trim().toLowerCase()
    items = items.filter((i) => i.description.toLowerCase().includes(needle))
  }

  return { totalCents, paidCents, items }
}

export interface ProjectionMonth {
  ym: string
  totalCents: number
  porBanco: { bankId: string; bankName: string; totalCents: number }[]
}

export async function getProjection(monthsAhead = 12): Promise<ProjectionMonth[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('card_projection', { p_months: monthsAhead })
  if (error || !data) return []
  return data as unknown as ProjectionMonth[]
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle()
  return { user: auth.user, profile: data }
}

/** Parcelas em aberto por banco: trava a exclusão do banco. */
export async function openInstallmentsByBank(): Promise<Map<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('card_installments')
    .select('purchase_id')
    .is('deleted_at', null)
    .is('paid_at', null)
    .limit(5000)

  const ids = [...new Set(((data ?? []) as { purchase_id: string }[]).map((r) => r.purchase_id))]
  if (ids.length === 0) return new Map()

  const { data: compras } = await supabase.from('card_purchases').select('id, bank_id').in('id', ids)
  const porCompra = new Map(((compras ?? []) as { id: string; bank_id: string }[]).map((c) => [c.id, c.bank_id]))

  const out = new Map<string, number>()
  for (const r of (data ?? []) as { purchase_id: string }[]) {
    const bank = porCompra.get(r.purchase_id)
    if (bank) out.set(bank, (out.get(bank) ?? 0) + 1)
  }
  return out
}

export function normalizeYm(raw: string | undefined | null): string {
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : currentYm()
}

function sanitizeLike(s: string): string {
  return s.trim().replace(/[%_,()]/g, '')
}

export type { CardInstallmentRow }
