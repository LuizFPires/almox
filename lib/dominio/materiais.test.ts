import { describe, expect, it } from 'vitest'
import {
  diferencasContagem,
  estadoSaldo,
  limiteDoAviso,
  ordenarSaldos,
  type SaldoMaterial,
} from './materiais'

const cimento: SaldoMaterial = { id: '1', nome: 'Cimento CP-II 50 kg', unidade: 'sc', saldo: 18, estoqueCheio: 500, aviso: { tipo: 'quantidade', valor: 20 } }
const areia: SaldoMaterial = { id: '2', nome: 'Areia média', unidade: 'm³', saldo: 7, estoqueCheio: 14, aviso: { tipo: 'percentual', valor: 50 } }

describe('materiais', () => {
  it('limite por quantidade', () => expect(limiteDoAviso(cimento)).toBe(20))
  it('limite por % do estoque cheio', () => expect(limiteDoAviso(areia)).toBe(7))
  it('sem aviso', () => expect(limiteDoAviso({ aviso: null, estoqueCheio: 10 })).toBeNull())
  it('estados', () => {
    expect(estadoSaldo(cimento)).toBe('abaixo')
    expect(estadoSaldo({ ...cimento, saldo: 20 })).toBe('abaixo')
    expect(estadoSaldo({ ...cimento, saldo: 30 })).toBe('perto')
    expect(estadoSaldo({ ...cimento, saldo: 31 })).toBe('ok')
    expect(estadoSaldo({ ...cimento, aviso: null })).toBe('sem_aviso')
  })
  it('ordena abaixo, perto, resto; alfabético dentro', () => {
    const base = { unidade: 'un', estoqueCheio: 100, aviso: { tipo: 'quantidade', valor: 10 } } as const
    const lista: SaldoMaterial[] = [
      { ...base, id: 'ok-b', nome: 'Brita', saldo: 90 },
      { ...base, id: 'perto', nome: 'Água', saldo: 14 },
      { ...base, id: 'abaixo-z', nome: 'Zinco', saldo: 5 },
      { ...base, id: 'abaixo-a', nome: 'Ácido', saldo: 10 },
      { ...base, id: 'ok-a', nome: 'Areia', saldo: 50 },
    ]
    expect(ordenarSaldos(lista).map((m) => m.id)).toEqual(['abaixo-a', 'abaixo-z', 'perto', 'ok-a', 'ok-b'])
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
