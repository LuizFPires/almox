'use client'

import { useEffect, useState } from 'react'
import type { PainelTv } from '@/lib/dominio/tv'

/** A TV pergunta a cada 2 s (decisão do M8); a resposta tem que chegar em 5 s. */
export const INTERVALO_MS = 2000
const LIMITE_MS = 5000

export type EstadoPainel = {
  painel: PainelTv
  /** Desde quando o servidor não responde (o painel segue com o último estado). */
  semConexaoDesde: Date | null
  naoAutorizado: boolean
}

/**
 * Busca o painel em ciclo, sem sobrepor pedidos. Só troca o estado quando os dados mudam,
 * então a animação não re-renderiza à toa. Reconecta sozinha: basta o próximo pedido dar certo.
 */
export function usePainel(inicial: PainelTv): EstadoPainel {
  const [estado, setEstado] = useState<EstadoPainel>({
    painel: inicial,
    semConexaoDesde: null,
    naoAutorizado: false,
  })

  useEffect(() => {
    let encerrado = false
    let espera: ReturnType<typeof setTimeout> | undefined
    // "agora" muda a cada pedido; só o resto decide se a tela precisa mudar.
    const semHora = (texto: string) => texto.replace(/"agora":"[^"]*",?/, '')
    let anterior = semHora(JSON.stringify(inicial))
    let caiu = false
    let controle: AbortController | undefined

    const buscar = async () => {
      controle = new AbortController()
      const limite = setTimeout(() => controle?.abort(), LIMITE_MS)
      try {
        const r = await fetch('/tv/dados', { cache: 'no-store', signal: controle.signal })
        if (r.status === 401) {
          if (!encerrado) setEstado((e) => ({ ...e, naoAutorizado: true }))
          return // revogado: para de perguntar
        }
        if (!r.ok) throw new Error(String(r.status))
        const texto = await r.text()
        if (encerrado) return
        const atual = semHora(texto)
        const mudou = atual !== anterior
        anterior = atual
        if (mudou || caiu) {
          const painel = mudou ? (JSON.parse(texto) as PainelTv) : undefined
          setEstado((e) => ({
            painel: painel ?? e.painel,
            semConexaoDesde: null,
            naoAutorizado: false,
          }))
        }
        caiu = false
      } catch {
        if (!encerrado && !caiu) {
          caiu = true
          const desde = new Date()
          setEstado((e) => ({ ...e, semConexaoDesde: desde }))
        }
      } finally {
        clearTimeout(limite)
      }
      if (!encerrado) espera = setTimeout(buscar, INTERVALO_MS)
    }
    espera = setTimeout(buscar, INTERVALO_MS)

    return () => {
      encerrado = true
      clearTimeout(espera)
      controle?.abort()
    }
    // `inicial` só serve para o primeiro estado; depois o ciclo segue sozinho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return estado
}
