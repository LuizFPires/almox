import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { planilhaDescontos, planilhaHistorico, planilhaMetricas } from './montar'

async function ler(buffer: Buffer) {
  const livro = new ExcelJS.Workbook()
  await livro.xlsx.load(buffer as unknown as ArrayBuffer)
  const aba = livro.worksheets[0]
  if (!aba) throw new Error('sem aba')
  return aba
}

describe('planilhaHistorico', () => {
  it('uma linha por lançamento, hora de São Paulo e formato brasileiro', async () => {
    const aba = await ler(
      await planilhaHistorico([
        {
          id: 'm1',
          tipo: 'retirada',
          quando: '2026-10-12T10:30:00.000Z',
          recebidoEm: '2026-10-12T13:00:00.000Z',
          pessoa: 'Zé Carlos',
          empresa: 'Fôrmas Ribeiro',
          via: 'qr',
          usuario: 'Sebastião Nunes',
          obs: null,
          estornoDe: null,
          itens: [
            { tipo: 'Pá', codigo: 'PA-03', avariada: false },
            { tipo: 'Pá', codigo: 'PA-04', avariada: false },
          ],
        },
      ]),
    )
    expect(aba.name).toBe('Histórico')
    expect(aba.getRow(1).getCell(1).value).toBe('Data e hora')
    const linha = aba.getRow(2)
    expect((linha.getCell(1).value as Date).toISOString()).toBe('2026-10-12T07:30:00.000Z')
    expect(linha.getCell(1).numFmt).toBe('dd/mm/yyyy hh:mm')
    expect(linha.getCell(2).value).toBe('Retirada')
    expect(linha.getCell(5).value).toBe('Pá PA-03, PA-04')
    expect(linha.getCell(6).value).toBe(2)
    expect(linha.getCell(7).value).toBe('QR do capacete')
    expect((linha.getCell(9).value as Date).toISOString()).toBe('2026-10-12T10:00:00.000Z')
  })
})

describe('planilhaDescontos', () => {
  it('valores em reais com formato R$ e total a descontar só do que está em aberto', async () => {
    const base = {
      cancelado_em: null,
      tipo_nome: 'Martelete',
      empresa: { nome: 'Fôrmas Ribeiro' },
      pessoa: { nome: 'Zé Carlos' },
      criado_em: '2026-10-11T23:59:00.000Z',
    }
    const aba = await ler(
      await planilhaDescontos([
        { ...base, codigo: 'MT-01', valor: 289000, status: 'aberto' },
        {
          ...base,
          codigo: 'MT-02',
          valor: 150050,
          status: 'cancelado',
          cancelado_em: '2026-10-12T12:00:00.000Z',
        },
      ]),
    )
    expect(aba.getRow(2).getCell(6).value).toBe(2890)
    expect(aba.getRow(2).getCell(6).numFmt).toBe('"R$" #,##0.00')
    expect(aba.getRow(3).getCell(6).value).toBe(1500.5)
    expect(aba.getRow(3).getCell(7).value).toBe('Cancelado (devolvida)')
    expect(aba.getRow(4).getCell(7).value).toBe('Total a descontar')
    expect(aba.getRow(4).getCell(6).value).toBe(2890)
  })
})

describe('planilhaMetricas', () => {
  it('metas do período e uma linha por semana', async () => {
    const livro = new ExcelJS.Workbook()
    await livro.xlsx.load(
      (await planilhaMetricas(
        [
          {
            semana: '2026-10-05',
            retiradas: 40,
            semQr: 2,
            tempoMedianaS: 11.5,
            tempoMedioS: 13,
            tempoAte15s: 30,
            tempoMedidas: 36,
            pendencias: 3,
            pendenciasComAviso: 3,
            movimentos: 70,
            movimentosCompletos: 70,
          },
        ],
        { de: '2026-10-05', ate: '2026-10-11' },
      )) as unknown as ArrayBuffer,
    )
    const metas = livro.getWorksheet('Metas')
    expect(metas?.getRow(2).values).toEqual([
      undefined,
      'Tempo do QR lido até a retirada (mediana)',
      '11,5 s',
      'até 15 s',
      'sim',
    ])
    expect(metas?.getRow(3).getCell(2).value).toBe('5%')
    const semana = livro.getWorksheet('Por semana')?.getRow(2)
    expect(semana?.getCell(4).value).toBe(0.05)
    expect(semana?.getCell(4).numFmt).toBe('0.0%')
  })
})
