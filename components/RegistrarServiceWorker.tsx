'use client'

import { useEffect } from 'react'

/** Registra o service worker (`public/sw.js`) para o app ser instalável. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      // Em desenvolvimento os arquivos do Next não têm hash: o SW não os guarda.
      .register(process.env.NODE_ENV === 'production' ? '/sw.js' : '/sw.js?dev=1', {
        scope: '/',
        updateViaCache: 'none',
      })
      .catch((erro: unknown) => console.error('Falha ao registrar o service worker', erro))
  }, [])
  return null
}
