import { describe, expect, it } from 'vitest'
import { textoMensagemAvaria, valorIndenizacao } from './avaria'

describe('valorIndenizacao', () => {
  it('sem ajuste, vale a reposição', () => {
    expect(valorIndenizacao({ valorReposicao: 289000, valorIndenizacao: null })).toEqual({
      centavos: 289000,
      ajustado: false,
    })
  })

  it('com ajuste do engenheiro, vale o ajustado (inclusive zero)', () => {
    expect(valorIndenizacao({ valorReposicao: 289000, valorIndenizacao: 15000 })).toEqual({
      centavos: 15000,
      ajustado: true,
    })
    expect(valorIndenizacao({ valorReposicao: 289000, valorIndenizacao: 0 }).centavos).toBe(0)
  })
})

describe('textoMensagemAvaria', () => {
  const base = {
    obra: 'Obra Demonstração',
    tipo: 'Martelete',
    codigo: 'MT-03',
    pessoa: 'Gilberto Alves',
    empresa: 'Armação Teixeira',
    // 13/10/2026 17:32 UTC = 14:32 em São Paulo
    quando: '2026-10-13T17:32:00Z',
    motivo: 'quebrada',
    detalhes: 'Ponteira empenada',
    centavos: 289000,
  }

  it('leva ferramenta, quem, data e hora em São Paulo, motivo, detalhes e valor', () => {
    expect(textoMensagemAvaria(base)).toBe(
      [
        '*Avaria de ferramenta — Obra Demonstração*',
        'Ferramenta: Martelete MT-03',
        'Devolvida por: Gilberto Alves (Armação Teixeira)',
        'Data: 13/10/2026 às 14:32',
        'Motivo: Quebrada',
        'Detalhes: Ponteira empenada',
        'Valor da indenização: R$ 2.890,00',
      ].join('\n'),
    )
  })

  it('sem detalhes nem pessoa, não deixa linha vazia', () => {
    const texto = textoMensagemAvaria({ ...base, detalhes: null, pessoa: null })
    expect(texto).not.toContain('Detalhes')
    expect(texto).not.toContain('Devolvida por')
    expect(texto.split('\n')).toHaveLength(5)
  })
})
