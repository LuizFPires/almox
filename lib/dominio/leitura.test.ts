import { describe, expect, it } from 'vitest'
import { mensagemCamera, mensagemLeitura, primeiroNome } from './leitura'

describe('leitura do capacete', () => {
  it('token desconhecido: "Capacete não cadastrado"', () => {
    expect(mensagemLeitura('nao_cadastrado').titulo).toBe('Capacete não cadastrado')
  })

  it('outra empresa não mostra nome', () => {
    const m = mensagemLeitura('outra_empresa')
    expect(m.titulo).toBe('Pessoa de outra empresa')
    expect(m.texto).not.toMatch(/[A-Z][a-z]+ [A-Z]/)
  })

  it('primeiro nome para a pergunta da conferência', () => {
    expect(primeiroNome('Joaquim Silva')).toBe('Joaquim')
    expect(primeiroNome('  José  Carlos ')).toBe('José')
  })

  it('erros de câmera em linguagem de obra', () => {
    expect(mensagemCamera({ name: 'NotAllowedError' })).toMatch(/Libere a câmera/)
    expect(mensagemCamera({ name: 'NotFoundError' })).toMatch(/Nenhuma câmera/)
    expect(mensagemCamera(new Error('x'))).toBe('Não foi possível abrir a câmera.')
  })
})
