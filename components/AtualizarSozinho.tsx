'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Recarrega os dados do servidor a cada `segundos` enquanto a tela está visível
 * (situação do agente e da fila de impressão). Para quando a aba fica escondida.
 */
export function AtualizarSozinho({ segundos = 5 }: { segundos?: number }) {
  const router = useRouter()
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, segundos * 1000)
    return () => clearInterval(intervalo)
  }, [router, segundos])
  return null
}
