import { describe, expect, it } from 'vitest'
import {
  metaAvisos,
  metaPerdas,
  metaRastreabilidade,
  metaSemQr,
  metaTempo,
  semanasCompletas,
  type SemanaMetricas,
} from './metricas'

function semana(p: Partial<SemanaMetricas>): SemanaMetricas {
  return semana_(p)
}

function semana_(p: Partial<SemanaMetricas>): SemanaMetricas {
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

  it('tempo: a média do período (critério do M11), com mediana e % até 15 s', () => {
    expect(
      metaTempo({ tempoMedidas: 40, tempoMedianaS: 12, tempoMedioS: 13.5, tempoAte15s: 31 }),
    ).toEqual({ valor: 13.5, texto: '13,5 s', ok: true, ate15: 77.5, mediana: 12 })
    expect(
      metaTempo({ tempoMedidas: 10, tempoMedianaS: 14, tempoMedioS: 21, tempoAte15s: 6 }).ok,
    ).toBe(false)
    expect(
      metaTempo({ tempoMedidas: 0, tempoMedianaS: null, tempoMedioS: null, tempoAte15s: 0 }).ok,
    ).toBeNull()
  })

  it('avisos e rastreabilidade: 100%', () => {
    expect(metaAvisos([semana({ pendencias: 4, pendenciasComAviso: 4 })]).ok).toBe(true)
    expect(metaAvisos([semana({ pendencias: 4, pendenciasComAviso: 3 })])).toMatchObject({
      texto: '75%',
      ok: false,
    })
    expect(metaRastreabilidade([semana({ movimentos: 9, movimentosCompletos: 9 })]).texto).toBe(
      '100% (garantido)',
    )
  })

  it('perdas: só semanas inteiras (a semana corrente e a primeira pela metade não contam)', () => {
    const s = (semana: string, n: number) => semana_({ semana, pendencias: n })
    const semanas = [
      s('2026-08-31', 0), // começou antes do período (de = 03/09)
      s('2026-09-07', 10),
      s('2026-09-14', 10),
      s('2026-09-21', 6),
      s('2026-09-28', 5),
      s('2026-10-05', 5),
      s('2026-10-12', 0), // semana corrente, pela metade
    ]
    expect(metaPerdas(semanas, '2026-09-03', '2026-10-13')).toEqual({
      valor: 50,
      texto: 'queda de 50%',
      ok: true,
    })
    expect(semanasCompletas(semanas, '2026-09-03', '2026-10-13').map((x) => x.semana)).toEqual([
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
    ])
    expect(metaPerdas(semanas.slice(0, 3), '2026-09-03', '2026-10-13').ok).toBeNull()
  })
})
