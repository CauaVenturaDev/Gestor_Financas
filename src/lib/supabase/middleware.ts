import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'

const PUBLIC_PATHS = [
  '/entrar',
  '/criar-conta',
  '/recuperar-senha',
  '/redefinir-senha',
  '/auth',
  '/offline',
]

/** Renova a sessão a cada request e protege as rotas /app. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() revalida o token: é o refresh silencioso da sessão persistente.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!user && pathname.startsWith('/app')) {
    const url = request.nextUrl.clone()
    url.pathname = '/entrar'
    url.searchParams.set('proximo', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isPublic && pathname !== '/redefinir-senha' && !pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/app/relatorio'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
