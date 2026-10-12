import { describe, expect, it } from 'vitest'
import {
  metaAvisos,
  metaPerdas,
  metaRastreabilidade,
  metaSemQr,
  metaTempo,
  type SemanaMetricas,
} from './metricas'

function semana(p: Partial<SemanaMetricas>): SemanaMetricas {
  return {
    semana: '2026-10-05',
    retiradas: 0,
    semQr: 0,
    tempoMedianaS: null,
    tempoMedioS: null,
    tempoAte15s: 0,
    tempoMedidas: 0,
    pendencias: 0,
    pendenciasComAviso: 0,
    movimentos: 0,
    movimentosCompletos: 0,
    ...p,
  }
}

describe('metas do piloto', () => {
  it('% sem QR: meta abaixo de 10%', () => {
    expect(
      metaSemQr([semana({ retiradas: 40, semQr: 3 }), semana({ retiradas: 60, semQr: 5 })]),
    ).toEqual({
      valor: 8,
      texto: '8%',
      ok: true,
    })
    expect(metaSemQr([semana({ retiradas: 10, semQr: 1 })]).ok).toBe(false)
    expect(metaSemQr([]).texto).toBe('sem retiradas')
  })

  it('tempo: mediana ponderada e % até 15 s', () => {
    const m = metaTempo([
      semana({ tempoMedianaS: 12, tempoMedidas: 30, tempoAte15s: 27 }),
      semana({ tempoMedianaS: 18, tempoMedidas: 10, tempoAte15s: 4 }),
    ])
    expect(m).toEqual({ valor: 13.5, texto: '13,5 s', ok: true, ate15: 77.5 })
    expect(metaTempo([semana({})]).ok).toBeNull()
  })

  it('avisos e rastreabilidade: 100%', () => {
    expect(metaAvisos([semana({ pendencias: 4, pendenciasComAviso: 4 })]).ok).toBe(true)
    expect(metaAvisos([semana({ pendencias: 4, pendenciasComAviso: 3 })])).toMatchObject({
      texto: '75%',
      ok: false,
    })
    expect(metaRastreabilidade([semana({ movimentos: 9, movimentosCompletos: 9 })]).texto).toBe(
      '100%',
    )
  })

  it('perdas: queda de 50% entre o começo e o fim', () => {
    const s = (n: number) => semana({ pendencias: n })
    expect(metaPerdas([s(10), s(10), s(6), s(4), s(5)])).toEqual({
      valor: 55,
      texto: 'queda de 55%',
      ok: true,
    })
    expect(metaPerdas([s(4), s(4), s(5), s(6)])).toMatchObject({
      texto: 'alta de 37,5%',
      ok: false,
    })
    expect(metaPerdas([s(1), s(1)]).ok).toBeNull()
  })
})
