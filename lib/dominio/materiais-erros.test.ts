import { describe, expect, it } from 'vitest'
import { mensagemErroMaterial } from './materiais'

describe('mensagemErroMaterial', () => {
  it('AL101 repassa a mensagem do servidor', () => {
    expect(mensagemErroMaterial('AL101', 'Saldo insuficiente: só tem 17 sc de Cimento.')).toBe(
      'Saldo insuficiente: só tem 17 sc de Cimento.',
    )
  })
  it('22023 repassa a mensagem do servidor', () => {
    expect(mensagemErroMaterial('22023', 'Quantidade inválida.')).toBe('Quantidade inválida.')
  })
  it('repassar sem mensagem cai no texto padrão', () => {
    expect(mensagemErroMaterial('AL101')).toBe('Não deu certo. Tente de novo.')
  })
  it.each([
    ['AL102', 'Não dá mais para desfazer. Peça ao engenheiro para corrigir.'],
    ['AL103', 'Este material foi desativado.'],
    ['AL104', 'Já existe um material com esse nome (pode estar desativado).'],
    ['AL105', 'Só dá para desativar com saldo zero.'],
    ['AL106', 'Conferência não se edita.'],
    ['AL107', 'Hora do celular errada. Acerte o relógio e tente de novo.'],
  ])('%s tem texto fixo', (codigo, texto) => {
    expect(mensagemErroMaterial(codigo, 'qualquer coisa')).toBe(texto)
  })
  it('outro código ou ausente', () => {
    expect(mensagemErroMaterial('XX000', 'x')).toBe('Não deu certo. Tente de novo.')
    expect(mensagemErroMaterial(undefined)).toBe('Não deu certo. Tente de novo.')
  })
})
