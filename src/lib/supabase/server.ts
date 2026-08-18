import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'
import type { Database } from '@/lib/database.types'

/**
 * Client de servidor (Server Components e Server Actions).
 * A sessão vive em cookie httpOnly; a service role nunca chega aqui.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component não pode escrever cookie: o middleware já renova a sessão.
        }
      },
    },
  })
}

/** Usuário autenticado ou null. Valida no servidor de auth, não confia no cookie. */
export async function getUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}
