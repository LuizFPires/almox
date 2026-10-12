'use client'

import { useLinkStatus } from 'next/link'
import type { ReactNode } from 'react'

/**
 * Conteúdo de uma aba da barra inferior. Ao tocar, a aba já fica marcada e mostra um traço
 * amarelo enquanto a tela nova chega (o toque responde na hora, mesmo com a rede lenta).
 */
export function ItemBarraInferior({
  atual,
  icone,
  rotulo,
}: {
  atual: boolean
  icone: ReactNode
  rotulo: string
}) {
  const { pending } = useLinkStatus()
  const marcado = atual || pending
  return (
    <span
      className={`relative flex flex-col items-center justify-center gap-1 ${marcado ? 'font-bold text-texto' : 'text-texto-2'}`}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="absolute -top-2.5 h-1 w-8 animate-pulse rounded-full bg-amarelo"
        />
      )}
      {icone}
      {rotulo}
      {pending && <span className="sr-only">Abrindo…</span>}
    </span>
  )
}
