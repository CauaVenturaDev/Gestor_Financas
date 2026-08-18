'use client'

import { useEffect } from 'react'

/** Registra o service worker da casca do PWA. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    const t = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // registro é melhoria progressiva: falhar aqui não quebra o app
      })
    }, 1200)
    return () => clearTimeout(t)
  }, [])

  return null
}
