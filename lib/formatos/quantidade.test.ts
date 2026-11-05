import { describe, expect, it } from 'vitest'
import {
  formatarQuantidade,
  lerQuantidade,
  quantidadeValida,
  unidadeAceitaDecimal,
} from './quantidade'

describe('formatarQuantidade', () => {
  it('milhar com ponto', () => expect(formatarQuantidade(1500)).toBe('1.500'))
  it('decimal com vírgula, sem zeros sobrando', () => {
    expect(formatarQuantidade(2.5)).toBe('2,5')
    expect(formatarQuantidade(1234567.25)).toBe('1.234.567,25')
    expect(formatarQuantidade(-22)).toBe('-22')
  })
})

describe('lerQuantidade', () => {
  it.each([
    ['1.500', 1500],
    ['1500', 1500],
    ['2,5', 2.5],
    ['1.234,75', 1234.75],
    [' 10 ', 10],
  ])('%s', (t, n) => expect(lerQuantidade(t)).toBe(n))
  it.each(['', 'abc', '1,234', '-3', '1.5.0', '1.5'])('recusa %s', (t) =>
    expect(lerQuantidade(t)).toBeNull(),
  )
})

describe('unidadeAceitaDecimal', () => {
  it('separa inteiras de decimais', () => {
    expect(unidadeAceitaDecimal('sc')).toBe(false)
    expect(unidadeAceitaDecimal('kg')).toBe(true)
  })
})

describe('quantidadeValida', () => {
  it('inteira em sc', () => {
    expect(quantidadeValida(3, 'sc')).toBe(true)
    expect(quantidadeValida(1.5, 'sc')).toBe(false)
  })
  it('decimal em m³ até 2 casas', () => {
    expect(quantidadeValida(1.25, 'm³')).toBe(true)
    expect(quantidadeValida(1.255, 'm³')).toBe(false)
  })
  it('faixa', () => {
    expect(quantidadeValida(0, 'kg')).toBe(false)
    expect(quantidadeValida(999_999, 'kg')).toBe(true)
    expect(quantidadeValida(1_000_000, 'kg')).toBe(false)
  })
})
