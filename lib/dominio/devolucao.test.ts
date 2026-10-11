import { describe, expect, it } from 'vitest'
import {
  agruparParaDevolver,
  limitarAvariadas,
  rotuloMotivo,
  statusDevolvido,
  textoFicaComEle,
  textoCarimbo,
  textoRegistrar,
  type ItemComEla,
} from './devolucao'

const item = (tipo: string, codigo: string, desde: string, via: 'qr' | 'manual'): ItemComEla => ({
  tipoId: tipo,
  tipo,
  icone: 'pa',
  codigo,
  desde,
  via,
})

const itens = [
  item('Pá', 'PA-07', '2026-10-11T10:00:00Z', 'qr'),
  item('Pá', 'PA-02', '2026-10-10T19:00:00Z', 'qr'),
  item('Pá', 'PA-100', '2026-10-11T10:00:00Z', 'manual'),
  item('Martelete', 'MT-01', '2026-10-11T08:00:00Z', 'manual'),
]

describe('devolução', () => {
  it('com QR: tudo, por tipo, mais antigas primeiro (RN-08)', () => {
    const g = agruparParaDevolver(itens, true)
    expect(g.map((x) => x.tipo)).toEqual(['Pá', 'Martelete'])
    expect(g[0]?.codigos).toEqual(['PA-02', 'PA-07', 'PA-100'])
  })

  it('sem QR: só o que saiu sem QR (RN-06)', () => {
    const g = agruparParaDevolver(itens, false)
    expect(g.map((x) => [x.tipo, x.codigos])).toEqual([
      ['Pá', ['PA-100']],
      ['Martelete', ['MT-01']],
    ])
  })

  it('avariadas nunca passam das que voltam', () => {
    expect(limitarAvariadas(3, 2)).toBe(2)
    expect(limitarAvariadas(1, 0)).toBe(0)
  })

  it('"Fica com ele"', () => {
    const g = agruparParaDevolver(itens, true)
    expect(textoFicaComEle(g, { Pá: 2 }, { Pá: 3, Martelete: 1 })).toBe('Pá ×1, Martelete ×1')
    expect(textoFicaComEle(g, { Pá: 3, Martelete: 1 }, { Pá: 3, Martelete: 1 })).toBe('nada')
  })

  it('botão na prioridade do protótipo', () => {
    expect(textoRegistrar(2, true)).toBe('Falta a foto da avaria')
    expect(textoRegistrar(0, false)).toBe('Informe quantas voltaram')
    expect(textoRegistrar(1, false)).toBe('Registrar devolução (1 item)')
    expect(textoRegistrar(3, false)).toBe('Registrar devolução (3 itens)')
  })

  it('status na tela de sucesso', () => {
    expect(statusDevolvido(2, 0)).toBe('de volta ao almoxarifado')
    expect(statusDevolvido(1, 1)).toBe('avariada · foi para manutenção')
    expect(statusDevolvido(3, 1)).toBe('2 em ordem · 1 para manutenção')
  })

  it('rótulos dos motivos', () => {
    expect(rotuloMotivo('cabo_rompido')).toBe('Cabo rompido')
    expect(rotuloMotivo('nao_liga')).toBe('Não liga')
  })

  it('carimbo da foto: ferramenta, data e hora da obra, quem fotografou', () => {
    expect(textoCarimbo('Pá', new Date('2026-10-11T17:32:00Z'), 'Ana (almoxarife)')).toBe(
      'Pá · 11/10/2026 14:32 · Ana (almoxarife)',
    )
  })
})
