import { describe, expect, it } from 'vitest'
import {
  TAMANHOS_ADESIVO,
  distribuirFolhas,
  ehTamanho,
  lerPuladas,
  porFolha,
  type TamanhoAdesivo,
} from './folha-adesivos'

describe('tamanhos do adesivo em A4', () => {
  it('9, 12 e 16 por folha', () => {
    expect(porFolha('grande')).toBe(9)
    expect(porFolha('medio')).toBe(12)
    expect(porFolha('pequeno')).toBe(16)
  })

  it('cabem na área útil da A4 (190 × 277 mm)', () => {
    for (const nome of Object.keys(TAMANHOS_ADESIVO) as TamanhoAdesivo[]) {
      const t = TAMANHOS_ADESIVO[nome]
      expect(t.colunas * t.larguraMm + (t.colunas - 1) * t.vaoMm, nome).toBeLessThanOrEqual(190)
      expect(t.linhas * t.alturaMm + (t.linhas - 1) * t.vaoMm, nome).toBeLessThanOrEqual(277)
    }
  })

  it('reconhece só os tamanhos que existem', () => {
    expect(ehTamanho('medio')).toBe(true)
    expect(ehTamanho('gigante')).toBe(false)
    expect(ehTamanho(undefined)).toBe(false)
  })
})

describe('espaços já usados da primeira folha', () => {
  it('ignora o que não existe e repetidos; ordena', () => {
    expect(lerPuladas('2,0,0,x,99,-1', 'grande')).toEqual([0, 2])
    expect(lerPuladas(null, 'medio')).toEqual([])
  })

  it('deixa sempre ao menos um espaço livre', () => {
    expect(lerPuladas('0,1,2,3,4,5,6,7,8', 'grande')).toHaveLength(8)
  })
})

describe('distribuirFolhas', () => {
  const nomes = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`)
  const conteudo = (folha: ReturnType<typeof distribuirFolhas<string>>[number]) =>
    folha.map((e) => (e.tipo === 'item' ? e.item : e.tipo === 'usado' ? 'x' : '.'))

  it('primeira folha pula os espaços usados; as seguintes vêm cheias', () => {
    const folhas = distribuirFolhas(nomes(10), 'grande', [0, 1, 2])
    expect(folhas).toHaveLength(2)
    expect(conteudo(folhas[0]!)).toEqual(['x', 'x', 'x', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'])
    expect(conteudo(folhas[1]!)).toEqual(['P7', 'P8', 'P9', 'P10', '.', '.', '.', '.', '.'])
  })

  it('médio: 12 por folha; 24 pessoas = 2 folhas cheias', () => {
    const folhas = distribuirFolhas(nomes(24), 'medio')
    expect(folhas).toHaveLength(2)
    expect(folhas.every((f) => f.length === 12 && f.every((e) => e.tipo === 'item'))).toBe(true)
  })

  it('sem ninguém, mostra a primeira folha para montar', () => {
    const folhas = distribuirFolhas([], 'pequeno', [5])
    expect(folhas).toHaveLength(1)
    expect(folhas[0]!.filter((e) => e.tipo === 'usado')).toHaveLength(1)
    expect(folhas[0]!).toHaveLength(16)
  })
})
