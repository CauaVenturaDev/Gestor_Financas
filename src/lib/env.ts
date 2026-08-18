/** Leitura das variáveis públicas do Supabase, com mensagem clara quando faltam. */
export function supabaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!v) throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada')
  return v
}

export function supabaseAnonKey(): string {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!v) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada')
  return v
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  ).replace(/\/$/, '')
}
