import ExcelJS from 'exceljs'
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

  it('número na célula de valor vira texto com vírgula (12,345 não vira R$ 12.345,00)', async () => {
    const livro = new ExcelJS.Workbook()
    const aba = livro.addWorksheet('Ferramentas')
    aba.addRow(['Nome', 'Ícone', 'Prefixo', 'Valor', 'Quantidade', 'Alto'])
    aba.addRow(['Trena', 'Pá', '', 12.345, 3, 'não'])
    const buf = Buffer.from(await livro.xlsx.writeBuffer())
    const lida = await lerPlanilha(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    )
    if ('erro' in lida) throw new Error(lida.erro)
    expect(lida.ferramentas[0]?.slice(3, 5)).toEqual(['12,35', '3'])
  })

  it('aba com linhas demais é recusada', async () => {
    const livro = new ExcelJS.Workbook()
    livro.addWorksheet('Pessoas').getCell('A6000').value = 'x'
    const buf = Buffer.from(await livro.xlsx.writeBuffer())
    const r = await lerPlanilha(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    )
    expect(r).toEqual({ erro: 'A aba Pessoas tem mais de 5000 linhas.' })
  })
})
