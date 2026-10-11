'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type Props = {
  segundos?: number
  /** Depois disso para de atualizar (tela esquecida aberta não fica consultando o banco). */
  minutos?: number
}

/**
 * Recarrega os dados do servidor a cada `segundos` enquanto a tela está visível
 * (situação do agente e da fila de impressão). Para quando a aba fica escondida.
 */
export function AtualizarSozinho({ segundos = 5, minutos = 10 }: Props) {
  const router = useRouter()
  useEffect(() => {
    const fim = Date.now() + minutos * 60_000
    const intervalo = setInterval(() => {
      if (Date.now() > fim) clearInterval(intervalo)
      else if (document.visibilityState === 'visible') router.refresh()
    }, segundos * 1000)
    return () => clearInterval(intervalo)
  }, [router, segundos, minutos])
  return null
}
