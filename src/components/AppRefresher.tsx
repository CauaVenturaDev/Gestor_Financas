'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Item 14 da seção 6.1: o iOS congela a aba, e o usuário pode reabrir o app no
 * dia seguinte com o mês antigo em tela. Ao voltar do segundo plano, revalida.
 * Só revalida se passou tempo suficiente, para alternar de app não pesar.
 */
export function AppRefresher() {
  const router = useRouter()
  const ultima = useRef(Date.now())

  useEffect(() => {
    const revalidar = () => {
      if (document.visibilityState !== 'visible') return
      const agora = Date.now()
      if (agora - ultima.current < 60_000) return
      ultima.current = agora
      router.refresh()
    }

    document.addEventListener('visibilitychange', revalidar)
    window.addEventListener('focus', revalidar)
    return () => {
      document.removeEventListener('visibilitychange', revalidar)
      window.removeEventListener('focus', revalidar)
    }
  }, [router])

  return null
}
