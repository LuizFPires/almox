'use client'

import { useEffect, useState } from 'react'
import type { PainelTv } from '@/lib/dominio/tv'

/** A TV pergunta a cada 2 s (decisão do M8); a resposta tem que chegar em 5 s. */
export const INTERVALO_MS = 2000
/** Sem autorização, segue perguntando devagar: volta sozinha se foi um erro passageiro. */
const INTERVALO_SEM_AUTORIZACAO_MS = 60_000
const LIMITE_MS = 5000

export type EstadoPainel = {
  painel: PainelTv
  /** Desde quando o servidor não responde (o painel segue com o último estado). */
  semConexaoDesde: Date | null
  naoAutorizado: boolean
  /** Hora do servidor menos a do mini PC: a pendência vira no dia da obra, não no do relógio. */
  diferencaMs: number
}

/**
 * Busca o painel em ciclo, sem sobrepor pedidos, mandando a versão que já tem: sem mudança, o
 * servidor responde só a hora e a tela não re-renderiza. Reconecta sozinha.
 */
const DESVIO_RELOGIO_MS = 2000

export function usePainel(inicial: PainelTv): EstadoPainel {
  const [estado, setEstado] = useState<EstadoPainel>({
    painel: inicial,
    semConexaoDesde: null,
    naoAutorizado: false,
    diferencaMs: 0,
  })

  useEffect(() => {
    let encerrado = false
    let espera: ReturnType<typeof setTimeout> | undefined
    let controle: AbortController | undefined
    let versao = inicial.versao
    let caiu = false
    let semAutorizacao = false
    let diferencaAtual: number | null = null

    const buscar = async () => {
      controle = new AbortController()
      const limite = setTimeout(() => controle?.abort(), LIMITE_MS)
      try {
        const r = await fetch(`/tv/dados?v=${encodeURIComponent(versao)}`, {
          cache: 'no-store',
          signal: controle.signal,
        })
        if (encerrado) return
        if (r.status === 401) {
          if (!semAutorizacao) {
            semAutorizacao = true
            setEstado((e) => ({ ...e, naoAutorizado: true }))
          }
          return
        }
        if (!r.ok) throw new Error(String(r.status))
        const corpo = (await r.json()) as Partial<PainelTv> & { agora: string }
        if (encerrado) return
        const diferencaMs = Date.parse(corpo.agora) - Date.now()
        const novo = corpo.pessoas ? (corpo as PainelTv) : null
        if (novo) versao = novo.versao
        // O relógio da TV se acerta pelo servidor mesmo sem mudança no painel (1ª resposta ou
        // desvio de mais de 2 s); abaixo disso não re-renderiza a cada consulta.
        const acertarRelogio =
          diferencaAtual === null || Math.abs(diferencaMs - diferencaAtual) > DESVIO_RELOGIO_MS
        if (novo || caiu || semAutorizacao || acertarRelogio) {
          diferencaAtual = diferencaMs
          setEstado((e) => ({
            painel: novo ?? e.painel,
            semConexaoDesde: null,
            naoAutorizado: false,
            diferencaMs,
          }))
        }
        caiu = false
        semAutorizacao = false
      } catch {
        if (!encerrado && !caiu) {
          caiu = true
          const desde = new Date()
          setEstado((e) => ({ ...e, semConexaoDesde: desde }))
        }
      } finally {
        clearTimeout(limite)
        if (!encerrado) {
          espera = setTimeout(buscar, semAutorizacao ? INTERVALO_SEM_AUTORIZACAO_MS : INTERVALO_MS)
        }
      }
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
