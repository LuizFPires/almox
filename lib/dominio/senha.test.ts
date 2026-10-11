import { describe, expect, it } from 'vitest'
import { gerarSenhaProvisoria, validarNovaSenha } from './senha'

describe('senha provisória', () => {
  it('tem 3 grupos de 4 caracteres sem letras ambíguas', () => {
    for (let i = 0; i < 50; i++) {
      expect(gerarSenhaProvisoria()).toMatch(
        /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/,
      )
    }
  })

  it('usa a fonte de aleatoriedade recebida', () => {
    expect(gerarSenhaProvisoria(() => new Uint8Array(16))).toBe('AAAA-AAAA-AAAA')
    // byte 255 (fora do limite) é descartado; 1 = 'B'
    expect(
      gerarSenhaProvisoria(() => Uint8Array.from({ length: 16 }, (_, i) => (i % 2 ? 1 : 255))),
    ).toBe('BBBB-BBBB-BBBB')
  })

  it('não repete entre chamadas', () => {
    const senhas = new Set(Array.from({ length: 200 }, () => gerarSenhaProvisoria()))
    expect(senhas.size).toBe(200)
  })
})

describe('nova senha', () => {
  it('exige 10 caracteres e confirmação igual', () => {
    expect(validarNovaSenha('curta', 'curta')).toBe('Use pelo menos 10 caracteres.')
    expect(validarNovaSenha('uma-senha-boa', 'outra-senha')).toBe('As duas senhas não são iguais.')
    expect(validarNovaSenha('uma-senha-boa', 'uma-senha-boa')).toBeNull()
  })
})
