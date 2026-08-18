'use client'

import { createBrowserClient } from '@supabase/ssr'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'
import type { Database } from '@/lib/database.types'

/** Client do navegador: só a anon key, sempre com a sessão do usuário. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey())
}
