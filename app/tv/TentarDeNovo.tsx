'use client'

import { useEffect } from 'react'

/** Sem servidor na primeira carga: tenta de novo sozinha (a TV não tem quem aperte F5). */
export function TentarDeNovo({ emMs = 10_000 }: { emMs?: number }) {
  useEffect(() => {
    const espera = setTimeout(() => window.location.reload(), emMs)
    return () => clearTimeout(espera)
  }, [emMs])
  return null
}
