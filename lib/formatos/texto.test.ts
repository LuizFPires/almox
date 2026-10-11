import { describe, expect, it } from 'vitest'
import { contemTexto, normalizarTexto } from './texto'

describe('normalizarTexto', () => {
  it('tira acento, passa para minúsculas e junta espaços', () => {
    expect(normalizarTexto('  João   Cláudio ')).toBe('joao claudio')
    expect(normalizarTexto('ZÉ CARLOS')).toBe('ze carlos')
    expect(normalizarTexto('Fôrmas Ribeiro')).toBe('formas ribeiro')
    expect(normalizarTexto('Açaí')).toBe('acai')
  })

  it('mantém sinais que não são acento', () => {
    expect(normalizarTexto('MT-02 · 1/2"')).toBe('mt-02 · 1/2"')
    expect(normalizarTexto('x^2')).toBe('x^2')
  })
})

describe('contemTexto', () => {
  it('compara normalizando os dois lados', () => {
    expect(contemTexto('João Silva', 'joao')).toBe(true)
    expect(contemTexto('joao silva', 'JOÃO')).toBe(true)
    expect(contemTexto('Martelete MT-02', 'mt-02')).toBe(true)
    expect(contemTexto('Pá', 'enxada')).toBe(false)
  })

  it('busca vazia encontra tudo', () => {
    expect(contemTexto('Qualquer', '   ')).toBe(true)
  })
})
