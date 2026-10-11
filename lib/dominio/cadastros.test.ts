import { describe, expect, it } from 'vitest'
import {
  capaceteRepetido,
  digitarNomeCapacete,
  compararCodigos,
  dataValida,
  faltaEmail,
  lerValorReposicao,
  normalizarNomeCapacete,
  previaCodigos,
  proximaCor,
  sugerirNomeCapacete,
  sugerirPrefixo,
  validarEmail,
  validarNomeCompleto,
  validarPrefixo,
} from './cadastros'

describe('pessoas', () => {
  it('exige nome e sobrenome', () => {
    expect(validarNomeCompleto('Joaquim')).toBe('Informe nome e sobrenome.')
    expect(validarNomeCompleto('  Joaquim   S ')).toBe('Informe nome e sobrenome.')
    expect(validarNomeCompleto('Joaquim Silva')).toBeNull()
    expect(validarNomeCompleto('José da Silva')).toBeNull()
  })

  it('sugere o primeiro nome no capacete, em maiúsculas', () => {
    expect(sugerirNomeCapacete('joão pedro costa')).toBe('JOÃO')
    expect(sugerirNomeCapacete('')).toBe('')
  })

  it('com nome repetido na obra, sugere a inicial do sobrenome', () => {
    expect(sugerirNomeCapacete('João Pedro Souza', ['JOAO', 'MARCOS'])).toBe('JOÃO S.')
    expect(sugerirNomeCapacete('Paulo', ['PAULO'])).toBe('PAULO')
  })

  it('detecta capacete repetido ignorando acento e caixa', () => {
    expect(capaceteRepetido('Zé Carlos', ['ZE CARLOS'])).toBe(true)
    expect(capaceteRepetido('ZÉ', ['ZE CARLOS'])).toBe(false)
    expect(capaceteRepetido('', ['X'])).toBe(false)
  })

  it('deixa digitar espaço no nome do capacete', () => {
    let campo = ''
    for (const letra of 'zé carlos') campo = digitarNomeCapacete(campo + letra)
    expect(campo).toBe('ZÉ CARLOS')
    expect(digitarNomeCapacete('  ZÉ   ')).toBe('ZÉ ')
  })

  it('normaliza o nome do capacete', () => {
    expect(normalizarNomeCapacete('  zé   carlos ')).toBe('ZÉ CARLOS')
    expect(normalizarNomeCapacete('a'.repeat(30))).toHaveLength(16)
  })
})

describe('empresas', () => {
  it('valida e-mail opcional ou obrigatório', () => {
    expect(validarEmail('')).toBeNull()
    expect(validarEmail('', true)).toBe('Informe o e-mail.')
    expect(validarEmail('dono@empresa')).toBe('E-mail inválido.')
    expect(validarEmail(' dono@empresa.com.br ')).toBeNull()
  })

  it('alerta empreiteira sem e-mail de dono ou encarregado', () => {
    const base = { dono_email: 'a@b.com', encarregado_email: 'c@d.com' }
    expect(faltaEmail({ tipo: 'empreiteira', ...base })).toBe(false)
    expect(faltaEmail({ tipo: 'empreiteira', ...base, encarregado_email: null })).toBe(true)
    expect(faltaEmail({ tipo: 'empreiteira', ...base, dono_email: '' })).toBe(true)
    expect(faltaEmail({ tipo: 'propria', dono_email: null, encarregado_email: null })).toBe(false)
  })

  it('escolhe a próxima cor livre', () => {
    expect(proximaCor([])).toBe('#F4B400')
    expect(proximaCor(['#f4b400', '#4C8DFF'])).toBe('#FF8A3D')
  })
})

describe('ferramentas', () => {
  it('lê o valor de reposição em reais', () => {
    expect(lerValorReposicao('2.890,00')).toEqual({ centavos: 289000 })
    expect(lerValorReposicao('2890,00')).toEqual({ centavos: 289000 })
    expect(lerValorReposicao('0,00')).toEqual({ erro: 'O valor precisa ser maior que zero.' })
    expect(lerValorReposicao('dois mil')).toEqual({
      erro: 'Valor inválido. Use o formato 2.890,00.',
    })
  })

  it('sugere prefixo sem acento e sem repetir', () => {
    expect(sugerirPrefixo('Betoneira')).toBe('BET')
    expect(sugerirPrefixo('Furadeira de impacto', ['FUR'])).toBe('FUD')
    expect(sugerirPrefixo('Régua')).toBe('REG')
    expect(sugerirPrefixo('Pá', [])).toBe('PA')
  })

  it('valida o prefixo', () => {
    expect(validarPrefixo('MT')).toBeNull()
    expect(validarPrefixo('m')).toBe('Use de 2 a 4 letras maiúsculas.')
  })

  it('mostra a prévia dos códigos que serão criados', () => {
    expect(previaCodigos('MT', ['MT-01', 'MT-02', 'MT-03', 'FUR-09'], 5)).toBe('MT-04 a MT-08')
    expect(previaCodigos('PA', [], 1)).toBe('PA-01')
    expect(previaCodigos('PA', [], 0)).toBe('')
  })
})

describe('revisão do M2', () => {
  it('data real do calendário', () => {
    expect(dataValida('2026-10-23')).toBe(true)
    expect(dataValida('2028-02-29')).toBe(true)
    expect(dataValida('2026-02-31')).toBe(false)
    expect(dataValida('23/10/2026')).toBe(false)
  })

  it('ordena códigos pelo número', () => {
    const codigos = ['FUR-100', 'FUR-11', 'FUR-02', 'ESC-01', 'FUR-99']
    expect([...codigos].sort(compararCodigos)).toEqual([
      'ESC-01',
      'FUR-02',
      'FUR-11',
      'FUR-99',
      'FUR-100',
    ])
  })

  it('prévia de códigos passa de 99 para 100', () => {
    const existentes = Array.from({ length: 99 }, (_, i) => `SER-${String(i + 1).padStart(2, '0')}`)
    expect(previaCodigos('SER', existentes, 2)).toBe('SER-100 a SER-101')
  })
})
