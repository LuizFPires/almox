'use client'

import { useEffect } from 'react'

/** Registra o service worker (`public/sw.js`) para o app ser instalável. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((erro: unknown) => console.error('Falha ao registrar o service worker', erro))
  }, [])
  return null
}
