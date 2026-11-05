import { describe, expect, it } from 'vitest'
import {
  diferencasContagem,
  emAlertaDeLimite,
  filtrarMateriais,
  ordenarParaLancamento,
  previaLancamento,
  estadoSaldo,
  limiteDoAviso,
  ordenarSaldos,
  textoAviso,
  type SaldoMaterial,
} from './materiais'

const cimento: SaldoMaterial = {
  id: '1',
  nome: 'Cimento CP-II 50 kg',
  unidade: 'sc',
  saldo: 18,
  estoqueCheio: 500,
  aviso: { tipo: 'quantidade', valor: 20 },
}
const areia: SaldoMaterial = {
  id: '2',
  nome: 'Areia média',
  unidade: 'm³',
  saldo: 7,
  estoqueCheio: 14,
  aviso: { tipo: 'percentual', valor: 50 },
}

describe('materiais', () => {
  it('limite por quantidade', () => expect(limiteDoAviso(cimento)).toBe(20))
  it('limite por % do estoque cheio', () => expect(limiteDoAviso(areia)).toBe(7))
  it('limite por % é inteiro, arredondado para cima', () => {
    const pct = (estoqueCheio: number, valor: number) =>
      limiteDoAviso({ aviso: { tipo: 'percentual', valor }, estoqueCheio })
    expect(pct(55, 25)).toBe(14) // 13,75
    expect(pct(1301, 1)).toBe(14) // 13,01
    expect(pct(56, 25)).toBe(14) // 14 exato
    expect(pct(0.3, 10)).toBe(1) // 0,03
    expect(pct(100.01, 1)).toBe(2) // 1,0001
    expect(pct(70, 20)).toBe(14) // 14,000000000000002 no ponto flutuante
  })
  it('sem aviso', () => expect(limiteDoAviso({ aviso: null, estoqueCheio: 10 })).toBeNull())
  it('estados', () => {
    expect(estadoSaldo(cimento)).toBe('abaixo')
    expect(estadoSaldo({ ...cimento, saldo: 20 })).toBe('abaixo')
    expect(estadoSaldo({ ...cimento, saldo: 30 })).toBe('perto')
    expect(estadoSaldo({ ...cimento, saldo: 31 })).toBe('ok')
    expect(estadoSaldo({ ...cimento, aviso: null })).toBe('sem_aviso')
  })
  it('alerta de limite: abaixo e já abastecido (estoque cheio > 0)', () => {
    expect(emAlertaDeLimite(cimento)).toBe(true)
    expect(emAlertaDeLimite({ ...cimento, estoqueCheio: 0, saldo: 0 })).toBe(false)
    expect(emAlertaDeLimite({ ...cimento, saldo: 30 })).toBe(false)
    expect(emAlertaDeLimite({ ...cimento, aviso: null })).toBe(false)
  })
  it('ordena abaixo, perto, resto; alfabético dentro', () => {
    const base = {
      unidade: 'un',
      estoqueCheio: 100,
      aviso: { tipo: 'quantidade', valor: 10 },
    } as const
    const lista: SaldoMaterial[] = [
      { ...base, id: 'ok-b', nome: 'Brita', saldo: 90 },
      { ...base, id: 'perto', nome: 'Água', saldo: 14 },
      { ...base, id: 'abaixo-z', nome: 'Zinco', saldo: 5 },
      { ...base, id: 'abaixo-a', nome: 'Ácido', saldo: 10 },
      { ...base, id: 'ok-a', nome: 'Areia', saldo: 50 },
    ]
    expect(ordenarSaldos(lista).map((m) => m.id)).toEqual([
      'abaixo-a',
      'abaixo-z',
      'perto',
      'ok-a',
      'ok-b',
    ])
  })
  it('contagem separa menos/mais/bateu pela diferença contado − saldoVisto', () => {
    const r = diferencasContagem([
      { materialId: '1', saldoVisto: 118, contado: 96 },
      { materialId: '2', saldoVisto: 12, contado: 15 },
      { materialId: '3', saldoVisto: 14, contado: 14 },
    ])
    expect(r.menos[0]?.diferenca).toBe(-22)
    expect(r.mais[0]?.diferenca).toBe(3)
    expect(r.bateu).toHaveLength(1)
  })
})

describe('lançamento de material', () => {
  const base = { unidade: 'sc', estoqueCheio: 200, aviso: null } as const
  const saco: SaldoMaterial = { ...cimento, saldo: 118, aviso: { tipo: 'quantidade', valor: 20 } }

  it('prévia da entrada soma ao saldo e não cruza limite', () => {
    expect(previaLancamento('entrada', saco, 500)).toEqual({
      depois: 618,
      excede: false,
      cruzaLimite: false,
      limite: 20,
    })
  })
  it('prévia da saída que cruza o limite', () => {
    const p = previaLancamento('saida', saco, 100)
    expect(p).toMatchObject({ depois: 18, excede: false, cruzaLimite: true })
    expect(previaLancamento('saida', saco, 98).cruzaLimite).toBe(true)
    expect(previaLancamento('saida', saco, 97).cruzaLimite).toBe(false)
  })
  it('saída já abaixo do limite não cruza de novo', () => {
    expect(previaLancamento('saida', { ...saco, saldo: 18 }, 1).cruzaLimite).toBe(false)
  })
  it('saída maior que o saldo excede e não avisa limite', () => {
    expect(previaLancamento('saida', saco, 119)).toMatchObject({ excede: true, cruzaLimite: false })
  })
  it('quantidade zero não cruza', () => {
    expect(previaLancamento('saida', { ...saco, saldo: 20.5 }, 0).cruzaLimite).toBe(false)
  })
  it('decimal sem erro de arredondamento', () => {
    expect(previaLancamento('saida', { ...areia, saldo: 0.3 }, 0.1).depois).toBe(0.2)
  })

  const lista: SaldoMaterial[] = [
    { ...base, id: 'a', nome: 'Areia', saldo: 5 },
    { ...base, id: 'b', nome: 'Brita', saldo: 0 },
    { ...base, id: 'c', nome: 'Cal', saldo: 3 },
    { ...base, id: 'd', nome: 'Ácido', saldo: 1 },
  ]

  it('entrada em ordem alfabética sem acento', () => {
    expect(ordenarParaLancamento('entrada', lista, ['c']).map((m) => m.id)).toEqual([
      'd',
      'a',
      'b',
      'c',
    ])
  })
  it('saída: com saldo primeiro, mais usados, depois alfabética; ignora ids que não estão na lista', () => {
    expect(ordenarParaLancamento('saida', lista, ['inativo', 'b', 'c']).map((m) => m.id)).toEqual([
      'c',
      'd',
      'a',
      'b',
    ])
  })
  it('busca normalizada', () => {
    expect(filtrarMateriais(lista, ' ACIDO ').map((m) => m.id)).toEqual(['d'])
    expect(filtrarMateriais(lista, '')).toHaveLength(4)
  })
})

describe('textoAviso', () => {
  it('descreve o aviso para as listas de cadastro', () => {
    expect(textoAviso({ unidade: 'sc', aviso: null })).toBe('sem aviso')
    expect(textoAviso({ unidade: 'sc', aviso: { tipo: 'quantidade', valor: 20 } })).toBe(
      'aviso em 20 sc',
    )
    expect(textoAviso({ unidade: 'kg', aviso: { tipo: 'percentual', valor: 15 } })).toBe(
      'aviso em 15%',
    )
  })
})
