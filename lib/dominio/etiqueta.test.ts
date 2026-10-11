import { describe, expect, it } from 'vitest'
import {
  gerarAdesivo,
  gerarAdesivoTspl,
  gerarAdesivoZpl,
  gerarEtiquetaTeste,
  type DadosAdesivo,
} from './etiqueta'

const dados: DadosAdesivo = {
  token: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012ab',
  nomeCapacete: 'ZÉ CARLOS',
  nomeCompleto: 'José Carlos Teixeira',
  funcao: 'Carpinteiro',
  empresa: 'Fôrmas Ribeiro',
  obra: 'SL Betim',
  matricula: 'P-0013',
}

function conteudoDoQr(etiqueta: string) {
  return /\^FDMA,([^^]*)\^FS/.exec(etiqueta)?.[1] ?? /QRCODE [^"]*"([^"]*)"/.exec(etiqueta)?.[1]
}

describe('adesivo do capacete', () => {
  for (const linguagem of ['ZPL', 'TSPL'] as const) {
    it(`${linguagem}: o QR contém só o token (RN-17)`, () => {
      const etiqueta = gerarAdesivo(linguagem, dados)
      expect(conteudoDoQr(etiqueta)).toBe(dados.token)
    })

    it(`${linguagem}: traz capacete, nome, função · empresa e rodapé`, () => {
      const etiqueta = gerarAdesivo(linguagem, dados)
      expect(etiqueta).toContain('ZÉ CARLOS')
      expect(etiqueta).toContain('José Carlos Teixeira')
      expect(etiqueta).toContain('Carpinteiro · Fôrmas Ribeiro')
      expect(etiqueta).toContain('ALMOX · SL Betim · P-0013')
    })

    it(`${linguagem}: recusa token que não é opaco`, () => {
      expect(() => gerarAdesivo(linguagem, { ...dados, token: 'José Carlos' })).toThrow()
      expect(() => gerarAdesivo(linguagem, { ...dados, token: 'https://x.com/?cpf=1' })).toThrow()
    })

    it(`${linguagem}: cópias de 1 a 5`, () => {
      expect(() => gerarAdesivo(linguagem, dados, 0)).toThrow()
      expect(() => gerarAdesivo(linguagem, dados, 6)).toThrow()
    })

    it(`${linguagem}: etiqueta de teste`, () => {
      expect(gerarEtiquetaTeste(linguagem, 'SL Betim')).toContain('Teste de impressão · SL Betim')
    })
  }

  it('ZPL: página 60 × 80 mm em UTF-8, cópias no ^PQ', () => {
    const zpl = gerarAdesivoZpl(dados, 3)
    expect(zpl.startsWith('^XA')).toBe(true)
    expect(zpl.endsWith('^XZ')).toBe(true)
    expect(zpl).toContain('^CI28')
    expect(zpl).toContain('^PW480')
    expect(zpl).toContain('^PQ3')
  })

  it('ZPL: ^ e ~ no texto não viram comando', () => {
    const zpl = gerarAdesivoZpl({ ...dados, nomeCompleto: 'José ^XZ ~JA Silva' })
    expect(zpl).toContain('José XZ JA Silva')
    expect(zpl.match(/\^XZ/g)).toHaveLength(1)
  })

  it('caracteres de controle (ESC, quebra de linha) não chegam à impressora', () => {
    const maldoso = { ...dados, empresa: 'Fôrmas\x1b!R Ribeiro', funcao: 'Pedreiro\r\n^XZ^XA\x07' }
    for (const etiqueta of [gerarAdesivoZpl(maldoso), gerarAdesivoTspl(maldoso)]) {
      // eslint-disable-next-line no-control-regex
      const semEstrutura = etiqueta.replace(/\r?\n/g, '')
      // eslint-disable-next-line no-control-regex
      expect(semEstrutura).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/)
      expect(etiqueta).toContain('Fôrmas !R Ribeiro')
    }
    expect(gerarAdesivoZpl(maldoso).match(/\^XZ/g)).toHaveLength(1)
  })

  it('TSPL: tamanho 60 × 80 mm, UTF-8, cópias no PRINT e aspas escapadas', () => {
    const tspl = gerarAdesivoTspl({ ...dados, nomeCompleto: 'José "Zé" Silva' }, 2)
    expect(tspl).toContain('SIZE 60 mm,80 mm')
    expect(tspl).toContain('CODEPAGE UTF-8')
    expect(tspl).toContain('PRINT 1,2')
    expect(tspl).toContain("José 'Zé' Silva")
    expect(tspl).not.toContain('"Zé"')
  })
})
