import { describe, expect, it } from 'vitest'
import { lerNovaConta } from './conta'

describe('lerNovaConta', () => {
  it('aceita nome e e-mail, normalizando espaços e caixa do e-mail', () => {
    expect(lerNovaConta('  Rafael   Souza ', ' Rafael.Souza@Obra.com ')).toEqual({
      nome: 'Rafael Souza',
      email: 'rafael.souza@obra.com',
    })
  })

  it('exige nome com pelo menos 2 letras e até 120', () => {
    expect(lerNovaConta('R', 'r@obra.com')).toEqual({ campos: { nome: 'Informe o seu nome.' } })
    expect(lerNovaConta('x'.repeat(121), 'r@obra.com')).toEqual({
      campos: { nome: 'Use até 120 caracteres.' },
    })
  })

  it('exige e-mail válido', () => {
    expect(lerNovaConta('Rafael', '')).toEqual({ campos: { email: 'Informe o e-mail.' } })
    expect(lerNovaConta('Rafael', 'rafael@')).toEqual({ campos: { email: 'E-mail inválido.' } })
  })

  it('devolve os dois erros de uma vez', () => {
    expect(lerNovaConta('', 'nada')).toEqual({
      campos: { nome: 'Informe o seu nome.', email: 'E-mail inválido.' },
    })
  })
})
