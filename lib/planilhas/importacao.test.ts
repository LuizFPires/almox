import { describe, expect, it } from 'vitest'
import { lerPlanilha, planilhaModelo } from './importacao'

describe('planilha modelo do cadastro inicial', () => {
  it('o modelo volta pela leitura com as linhas de exemplo de cada aba', async () => {
    const modelo = await planilhaModelo(['Pá', 'Martelete'])
    const lida = await lerPlanilha(
      modelo.buffer.slice(modelo.byteOffset, modelo.byteOffset + modelo.byteLength) as ArrayBuffer,
    )
    if ('erro' in lida) throw new Error(lida.erro)
    expect(lida.empresas[0]?.[0]).toBe('Fôrmas Ribeiro')
    expect(lida.pessoas[0]).toEqual([
      'José Carlos Teixeira',
      'ZÉ CARLOS',
      'Carpinteiro',
      'Fôrmas Ribeiro',
    ])
    expect(lida.ferramentas[0]?.slice(0, 5)).toEqual([
      'Martelete',
      'Martelete',
      '',
      '2.890,00',
      '3',
    ])
  }, 30_000)

  it('arquivo que não é planilha: erro claro', async () => {
    const r = await lerPlanilha(new TextEncoder().encode('não sou xlsx').buffer as ArrayBuffer)
    expect(r).toEqual({
      erro: 'Não foi possível abrir o arquivo. Envie a planilha modelo em .xlsx.',
    })
  })
})
