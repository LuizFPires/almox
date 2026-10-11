import { describe, expect, it } from 'vitest'
import { formatarBRL, lerBRL } from './moeda'

describe('formatarBRL', () => {
  it('formata centavos no padrão brasileiro', () => {
    expect(formatarBRL(123456)).toBe('R$ 1.234,56')
  })

  it('formata zero, centavos e milhões', () => {
    expect(formatarBRL(0)).toBe('R$ 0,00')
    expect(formatarBRL(5)).toBe('R$ 0,05')
    expect(formatarBRL(289000)).toBe('R$ 2.890,00')
    expect(formatarBRL(123456789)).toBe('R$ 1.234.567,89')
  })

  it('formata valores negativos', () => {
    expect(formatarBRL(-150)).toBe('-R$ 1,50')
  })

  it('recusa valor que não é inteiro em centavos', () => {
    expect(() => formatarBRL(12.5)).toThrow()
    expect(() => formatarBRL(Number.NaN)).toThrow()
  })
})

describe('lerBRL', () => {
  it('aceita 2.890,00 e 2890,00 como 289000 centavos', () => {
    expect(lerBRL('2.890,00')).toBe(289000)
    expect(lerBRL('2890,00')).toBe(289000)
  })

  it('aceita prefixo R$, espaços, inteiros e uma casa decimal', () => {
    expect(lerBRL(' R$ 1.234,56 ')).toBe(123456)
    expect(lerBRL('65')).toBe(6500)
    expect(lerBRL('1.500')).toBe(150000)
    expect(lerBRL('0,5')).toBe(50)
    expect(lerBRL('38,9')).toBe(3890)
  })

  it('devolve null para texto inválido', () => {
    expect(lerBRL('')).toBeNull()
    expect(lerBRL('abc')).toBeNull()
    expect(lerBRL('2,890.00')).toBeNull()
    expect(lerBRL('2.89')).toBeNull()
    expect(lerBRL('1,234')).toBeNull()
    expect(lerBRL('-10,00')).toBeNull()
    expect(lerBRL('12.34.567,00')).toBeNull()
    expect(lerBRL('1.5')).toBeNull()
    expect(lerBRL('2.890')).toBe(289000)
  })

  it('volta ao mesmo valor depois de formatar', () => {
    for (const centavos of [0, 1, 99, 100, 289000, 123456789]) {
      expect(lerBRL(formatarBRL(centavos))).toBe(centavos)
    }
  })
})
