import { describe, expect, it } from 'vitest'
import { rotuloStatusAviso, rotuloStatusDesconto, totalEmAberto, valorDoAviso } from './avisos'

describe('avisos', () => {
  it('em aberto: só as peças ainda não devolvidas (RN-14, peça a peça)', () => {
    expect(
      totalEmAberto(
        [
          { codigo: 'PA-01', valor: 8900 },
          { codigo: 'PA-02', valor: 8900 },
          { codigo: 'SER-01', valor: 89000 },
        ],
        [
          { codigo: 'PA-01', status: 'cancelado' },
          { codigo: 'PA-02', status: 'aberto' },
          { codigo: 'SER-01', status: 'aberto' },
        ],
      ),
    ).toBe(97900)
  })

  it('rótulos', () => {
    expect(rotuloStatusAviso('cancelado').texto).toBe('Cancelado: ferramentas devolvidas')
    expect(rotuloStatusAviso('enviado').tom).toBe('erro')
    expect(rotuloStatusDesconto('cancelado')).toBe('devolvida')
  })
})

describe('valor do aviso', () => {
  const d = (
    codigo: string,
    valor: number,
    status: 'aberto' | 'cancelado' | 'confirmado',
    primeiro: string,
  ) => ({
    codigo,
    valor,
    status,
    primeiroAvisoId: primeiro,
  })
  const descontos = [
    d('PA-01', 8900, 'confirmado', 'a1'),
    d('PA-02', 8900, 'cancelado', 'a1'),
    d('SER-01', 89000, 'confirmado', 'a2'),
  ]

  it('descontado: só o que este aviso cobrou primeiro e foi confirmado', () => {
    expect(valorDoAviso('a1', 'confirmado', descontos)).toEqual({ lembrete: false, valor: 8900 })
  })

  it('lembrete: as mesmas peças de um aviso anterior não somam de novo', () => {
    expect(valorDoAviso('a3', 'confirmado', descontos)).toEqual({ lembrete: true, valor: 0 })
  })
})
