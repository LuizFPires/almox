import { describe, expect, it } from 'vitest'
import {
  previaCodigos,
  resumoEscolhas,
  somarUm,
  textoConfirmacao,
  textoContinuar,
  textoDisponivel,
  type TipoParaRetirar,
} from './retirada'

const tipo = (nome: string, livres: string[] = []): TipoParaRetirar => ({
  id: nome,
  nome,
  icone: 'pa',
  altoValor: false,
  livres,
})

describe('grade da retirada', () => {
  it('texto de livres', () => {
    expect(textoDisponivel(5, 0)).toBe('5 livres')
    expect(textoDisponivel(1, 0)).toBe('1 livre')
    expect(textoDisponivel(5, 2)).toBe('de 5 livres')
    expect(textoDisponivel(0, 0)).toBe('nenhuma livre')
  })

  it('toque soma 1 até o limite de livres (RN-07)', () => {
    expect(somarUm(0, 2)).toBe(1)
    expect(somarUm(2, 2)).toBe(2)
    expect(somarUm(0, 0)).toBe(0)
  })

  it('botão continuar', () => {
    expect(textoContinuar(0)).toBe('Selecione as ferramentas')
    expect(textoContinuar(1)).toBe('Continuar (1 item)')
    expect(textoContinuar(3)).toBe('Continuar (3 itens)')
  })

  it('resumo das escolhidas', () => {
    expect(
      resumoEscolhas([
        { tipo: tipo('Furadeira'), quantidade: 2 },
        { tipo: tipo('Martelo'), quantidade: 0 },
        { tipo: tipo('Pá'), quantidade: 1 },
      ]),
    ).toBe('Furadeira ×2, Pá ×1')
    expect(resumoEscolhas([])).toBe('nenhum')
  })
})

describe('revisão', () => {
  it('prévia: livres de menor código, com 100 depois de 99 (RN-08)', () => {
    expect(previaCodigos(['PA-100', 'PA-07', 'PA-99', 'PA-02'], 3)).toEqual([
      'PA-02',
      'PA-07',
      'PA-99',
    ])
  })

  it('confirmação obrigatória, com alto valor em destaque', () => {
    expect(textoConfirmacao('Joaquim', false)).toBe(
      'Conferi pessoalmente: é o Joaquim que está pegando.',
    )
    expect(textoConfirmacao('Joaquim', true)).toBe(
      'Inclui ferramenta de alto valor. Conferi pessoalmente: é o Joaquim que está pegando.',
    )
  })
})
