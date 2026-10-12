import { describe, expect, it } from 'vitest'
import { rotuloStatusAviso, rotuloStatusDesconto, totalEmAberto } from './avisos'

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
