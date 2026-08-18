import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Tudo, menos arquivos estáticos e a casca do PWA.
     * O middleware renova a sessão a cada request: é o refresh silencioso
     * que mantém o app instalado logado depois de dias fechado.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|offline).*)',
  ],
}
