import { describe, expect, it } from 'vitest'
import { chaveRascunhoContagem, itensDoRascunho, type SaldoMaterial } from './materiais'

const mat = (id: string, unidade: SaldoMaterial['unidade'], saldo: number): SaldoMaterial => ({
  id,
  nome: id,
  unidade,
  saldo,
  estoqueCheio: saldo,
  aviso: null,
})

describe('chaveRascunhoContagem', () => {
  it('une obra e dia', () => {
    expect(chaveRascunhoContagem('obra-1', '2026-11-04')).toBe('almox:contagem:obra-1:2026-11-04')
  })
})

describe('itensDoRascunho', () => {
  const saldos = [mat('a', 'sc', 10), mat('b', 'kg', 5), mat('c', 'sc', 7)]

  it('ignora campo vazio', () => {
    expect(itensDoRascunho({ a: { valor: '  ', saldoVisto: 10 } }, saldos)).toEqual([])
  })

  it('lê 1.500 como 1500', () => {
    expect(itensDoRascunho({ a: { valor: '1.500', saldoVisto: 10 } }, saldos)).toEqual([
      { materialId: 'a', saldoVisto: 10, contado: 1500 },
    ])
  })

  it('ignora decimal em unidade inteira e aceita em kg', () => {
    const r = itensDoRascunho(
      { a: { valor: '1,5', saldoVisto: 10 }, b: { valor: '1,5', saldoVisto: 5 } },
      saldos,
    )
    expect(r).toEqual([{ materialId: 'b', saldoVisto: 5, contado: 1.5 }])
  })

  it('aceita zero (acabou)', () => {
    expect(itensDoRascunho({ c: { valor: '0', saldoVisto: 7 } }, saldos)).toEqual([
      { materialId: 'c', saldoVisto: 7, contado: 0 },
    ])
  })

  it('preserva o saldoVisto mesmo com o saldo atual diferente', () => {
    const r = itensDoRascunho({ a: { valor: '8', saldoVisto: 12 } }, saldos)
    expect(r[0]?.saldoVisto).toBe(12)
  })

  it('ignora material que não existe mais e texto inválido', () => {
    expect(
      itensDoRascunho({ x: { valor: '3', saldoVisto: 1 }, a: { valor: 'abc', saldoVisto: 10 } }, saldos),
    ).toEqual([])
  })
})
