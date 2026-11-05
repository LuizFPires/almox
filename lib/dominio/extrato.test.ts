import { describe, expect, it } from 'vitest'
import {
  agruparPorDia,
  diaValido,
  lerFiltroExtrato,
  passaNoTipo,
  periodoDoAtalho,
  resumoDoDia,
  rotuloDoDia,
  somarDias,
  urlDoFiltro,
} from './extrato'

const HOJE = '2026-11-05'
const UUID = 'f0000000-0000-4000-8000-000000000001'

describe('extrato · período', () => {
  it('atalhos', () => {
    expect(periodoDoAtalho('hoje', HOJE)).toEqual({ de: HOJE, ate: HOJE })
    expect(periodoDoAtalho('7', HOJE)).toEqual({ de: '2026-10-30', ate: HOJE })
    expect(periodoDoAtalho('30', HOJE)).toEqual({ de: '2026-10-07', ate: HOJE })
    expect(periodoDoAtalho('mes', HOJE)).toEqual({ de: '2026-11-01', ate: HOJE })
  })
  it('somar dias atravessa mês e ano', () => {
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('dia válido', () => {
    expect(diaValido('2026-11-05')).toBe(true)
    expect(diaValido('2026-02-30')).toBe(false)
    expect(diaValido('05/11/2026')).toBe(false)
  })
})

describe('extrato · filtro da URL', () => {
  it('sem nada: 7 dias, todos, tudo', () => {
    expect(lerFiltroExtrato({}, HOJE)).toEqual({
      atalho: '7',
      de: '2026-10-30',
      ate: HOJE,
      material: null,
      tipo: 'tudo',
    })
  })
  it('datas livres, desviradas se vierem trocadas', () => {
    const f = lerFiltroExtrato({ p: 'livre', de: '2026-11-03', ate: '2026-10-01' }, HOJE)
    expect(f).toMatchObject({ atalho: 'livre', de: '2026-10-01', ate: '2026-11-03' })
  })
  it('só uma data livre vira período de um dia', () => {
    expect(lerFiltroExtrato({ p: 'livre', de: '2026-11-02' }, HOJE)).toMatchObject({
      de: '2026-11-02',
      ate: '2026-11-02',
    })
  })
  it('lixo volta ao padrão', () => {
    const f = lerFiltroExtrato({ p: 'xx', m: 'nao-uuid', t: 'roubo' }, HOJE)
    expect(f).toMatchObject({ atalho: '7', material: null, tipo: 'tudo' })
    expect(lerFiltroExtrato({ p: 'livre', de: 'ontem' }, HOJE).atalho).toBe('7')
  })
  it('material e tipo', () => {
    expect(lerFiltroExtrato({ m: UUID, t: 'saida' }, HOJE)).toMatchObject({
      material: UUID,
      tipo: 'saida',
    })
  })
  it('URL de volta, sem os padrões', () => {
    expect(urlDoFiltro(lerFiltroExtrato({}, HOJE))).toBe('')
    expect(
      urlDoFiltro({
        atalho: 'livre',
        de: '2026-10-01',
        ate: '2026-10-31',
        material: UUID,
        tipo: 'ajuste',
      }),
    ).toBe(`?p=livre&de=2026-10-01&ate=2026-10-31&m=${UUID}&t=ajuste`)
    expect(urlDoFiltro({ atalho: 'hoje', de: HOJE, ate: HOJE, material: null, tipo: 'tudo' })).toBe(
      '?p=hoje',
    )
  })
})

describe('extrato · linha do tempo', () => {
  it('ajustes incluem conferências', () => {
    expect(passaNoTipo('conferencia', 'ajuste')).toBe(true)
    expect(passaNoTipo('conferencia', 'saida')).toBe(false)
    expect(passaNoTipo('entrada', 'tudo')).toBe(true)
  })
  it('agrupa pelo dia da obra (fuso de São Paulo)', () => {
    const g = agruparPorDia([
      { id: 'a', criadoEm: '2026-11-05T12:00:00Z' },
      { id: 'b', criadoEm: '2026-11-05T02:30:00Z' }, // 23:30 do dia 04 em São Paulo
      { id: 'c', criadoEm: '2026-11-04T15:00:00Z' },
    ])
    expect(g.map((x) => [x.dia, x.linhas.map((l) => l.id)])).toEqual([
      ['2026-11-05', ['a']],
      ['2026-11-04', ['b', 'c']],
    ])
  })
  it('rótulo do dia', () => {
    expect(rotuloDoDia(HOJE, HOJE)).toBe('Hoje · 05/11/2026')
    expect(rotuloDoDia('2026-11-04', HOJE)).toBe('Ontem · 04/11/2026')
    expect(rotuloDoDia('2026-11-02', HOJE)).toBe('seg · 02/11/2026')
  })
  it('resumo do dia ignora apagados', () => {
    const l = (tipo: 'entrada' | 'saida' | 'ajuste', apagado = false) => ({
      tipo,
      apagado,
      desfeito: false,
    })
    expect(resumoDoDia([l('entrada'), l('entrada'), l('saida'), l('saida', true)])).toBe(
      '2 entradas · 1 saída',
    )
    expect(resumoDoDia([l('ajuste')])).toBe('1 lançamento')
  })
})
