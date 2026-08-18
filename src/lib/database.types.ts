/**
 * Tipos do banco, escritos à mão a partir das migrações em supabase/migrations.
 * Ao alterar o esquema, atualize este arquivo (ou gere com
 * `supabase gen types typescript --linked > src/lib/database.types.ts`).
 */

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[]

export type Kind = 'receita' | 'despesa' | 'aporte' | 'resgate'
export type Nature = 'receita' | 'despesa' | 'investimento'
export type TxStatus = 'previsto' | 'efetivado'
export type RecStatus = 'ativa' | 'pausada' | 'encerrada'
export type InstallmentStatus = 'paga' | 'atrasada' | 'em_aberto'
export type PurchaseStatus = 'quitada' | 'atrasada' | 'em_andamento'

export type ProfileRow = {
  id: string
  display_name: string | null
  timezone: string
  created_at: string
}

export type CategoryRow = {
  id: string
  user_id: string
  nature: Nature
  name: string
  is_system: boolean
  is_archived: boolean
  created_at: string
  deleted_at: string | null
}

export type RecurrenceRow = {
  id: string
  user_id: string
  kind: Extract<Kind, 'receita' | 'despesa'>
  name: string
  note: string | null
  category_id: string | null
  category_nature: Nature | null
  amount_cents: number | null
  day_of_month: number
  start_date: string
  end_date: string | null
  status: RecStatus
  auto_confirm: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TransactionRow = {
  id: string
  user_id: string
  kind: Kind
  name: string
  note: string | null
  date: string
  amount_cents: number | null
  status: TxStatus
  category_id: string | null
  category_nature: Nature | null
  recurrence_id: string | null
  occurrence_ym: string | null
  is_detached: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type BankRow = {
  id: string
  user_id: string
  name: string
  is_archived: boolean
  created_at: string
  deleted_at: string | null
}

export type CardPurchaseRow = {
  id: string
  user_id: string
  bank_id: string
  purchase_date: string
  description: string
  total_cents: number
  installments_count: number
  first_due_date: string
  settled_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type CardInstallmentRow = {
  id: string
  user_id: string
  purchase_id: string
  number: number
  due_date: string
  amount_cents: number
  paid_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type VCardInstallmentRow = CardInstallmentRow & {
  status: InstallmentStatus
}

export type VCardPurchaseRow = CardPurchaseRow & {
  paid_count: number
  overdue_count: number
  current_number: number
  open_cents: number
  status: PurchaseStatus
}

type Table<R> = {
  Row: R
  Insert: Partial<R>
  Update: Partial<R>
  Relationships: []
}

type View<R> = { Row: R; Relationships: [] }

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>
      categories: Table<CategoryRow>
      recurrences: Table<RecurrenceRow>
      transactions: Table<TransactionRow>
      banks: Table<BankRow>
      card_purchases: Table<CardPurchaseRow>
      card_installments: Table<CardInstallmentRow>
    }
    Views: {
      v_card_installments: View<VCardInstallmentRow>
      v_card_purchases: View<VCardPurchaseRow>
    }
    Functions: {
      today_brt: { Args: Record<string, never>; Returns: string }
      ensure_occurrences: { Args: { p_start_ym: string; p_end_ym: string }; Returns: number }
      purge_future_occurrences: { Args: { p_recurrence: string; p_from: string }; Returns: number }
      create_purchase: {
        Args: {
          p_bank_id: string
          p_purchase_date: string
          p_description: string
          p_total_cents: number
          p_count: number
          p_current_number: number
          p_current_due: string
        }
        Returns: string
      }
      rebuild_installments: {
        Args: {
          p_purchase: string
          p_total_cents: number
          p_count: number
          p_current_number: number
          p_current_due: string
        }
        Returns: never
      }
      settle_purchase: { Args: { p_purchase: string; p_date: string }; Returns: number }
      patrimonio_em: { Args: { p_date: string; p_exclude?: string | null }; Returns: number }
      delete_category: { Args: { p_id: string; p_reassign_to?: string | null }; Returns: number }
      delete_account: { Args: Record<string, never>; Returns: never }
      month_overview: { Args: { p_ym: string }; Returns: Json }
      patrimonio_mensal: { Args: Record<string, never>; Returns: Json }
      card_projection: { Args: { p_months: number }; Returns: Json }
      category_breakdown: {
        Args: { p_ym: string; p_incluir_previstos?: boolean }
        Returns: Json
      }
    }
    Enums: {
      kind_t: Kind
      nature_t: Nature
      tx_status_t: TxStatus
      rec_status_t: RecStatus
    }
    CompositeTypes: Record<string, never>
  }
}
