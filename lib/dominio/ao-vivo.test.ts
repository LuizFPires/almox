import { describe, expect, it } from 'vitest'
import { AGRUPAR_MS, esperaAtualizacao, PRAZO_MAXIMO_MS } from './ao-vivo'

/** Simula eventos e diz quando a tela atualizou (mesma regra do AoVivo). */
function simular(eventos: number[], fim: number): number[] {
  const atualizacoes: number[] = []
  let primeiro: number | null = null
  let marcada: number | null = null
  const fila = [...eventos].sort((a, b) => a - b)
  for (let t = 0; t <= fim; t++) {
    if (marcada !== null && t >= marcada) {
      atualizacoes.push(t)
      marcada = null
      primeiro = null
    }
    while (fila[0] === t) {
      fila.shift()
      primeiro ??= t
      marcada = t + esperaAtualizacao(t, primeiro)
    }
  }
  return atualizacoes
}

describe('atualização ao vivo', () => {
  it('rajada curta vira uma atualização 400 ms depois do último evento', () => {
    expect(simular([0, 100, 200], 2000)).toEqual([200 + AGRUPAR_MS])
  })

  it('eventos sem parar (100 a cada 100 ms) não congelam a tela: atualiza a cada 3 s', () => {
    const eventos = Array.from({ length: 100 }, (_, i) => i * 100)
    const atualizacoes = simular(eventos, 11_000)
    expect(atualizacoes[0]).toBe(PRAZO_MAXIMO_MS)
    expect(atualizacoes.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < atualizacoes.length; i++) {
      expect(atualizacoes[i]! - atualizacoes[i - 1]!).toBeLessThanOrEqual(PRAZO_MAXIMO_MS + 100)
    }
  })

  it('evento isolado espera só os 400 ms', () => {
    expect(esperaAtualizacao(5000, 5000)).toBe(AGRUPAR_MS)
    expect(esperaAtualizacao(5000, 5000 - PRAZO_MAXIMO_MS)).toBe(0)
  })
})
