import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Troca o código do e-mail (confirmação de cadastro ou recuperação de senha)
 * por uma sessão em cookie httpOnly. Aceita os dois formatos de template:
 * `?code=` (PKCE) e `?token_hash=&type=` (link direto do Supabase).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/app/relatorio'
  const destino = next.startsWith('/') ? next : '/app/relatorio'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${destino}`)
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${destino}`)
  }

  return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`)
}
