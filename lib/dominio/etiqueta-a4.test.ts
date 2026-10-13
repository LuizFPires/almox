import { describe, expect, it } from 'vitest'
import { layoutAdesivoA4 } from './etiqueta-a4'

const dados = {
  nomeCapacete: 'ZÉ CARLOS',
  nomeCompleto: 'José Carlos da Silva',
  funcao: 'Pedreiro',
  empresa: 'Construtora',
  obra: 'Obra Demonstração',
  matricula: 'P-0013',
}

describe('adesivo em A4 (médio e pequeno)', () => {
  it('médio: 5 × 6,5 cm, QR de 2,8 cm centralizado, com função e empresa', () => {
    const l = layoutAdesivoA4(dados, 'medio')
    expect([l.larguraMm, l.alturaMm]).toEqual([50, 65])
    expect(l.qr.lado).toBe(28)
    expect(l.qr.x).toBe(11)
    expect(l.linhas.map((x) => x.texto)).toEqual([
      'ZÉ CARLOS',
      'José Carlos da Silva',
      'Pedreiro · Construtora',
    ])
  })

  it('pequeno: 4,5 × 6 cm, QR de 2,5 cm, só apelido e nome', () => {
    const l = layoutAdesivoA4(dados, 'pequeno')
    expect([l.larguraMm, l.alturaMm, l.qr.lado]).toEqual([45, 60, 25])
    expect(l.linhas.map((x) => x.texto)).toEqual(['ZÉ CARLOS', 'José Carlos da Silva'])
    expect(l.rodape.esquerda).toBe('ALMOX')
  })

  it('apelido comprido encolhe, mas nunca abaixo de 4 mm; nada passa do rodapé', () => {
    for (const tamanho of ['medio', 'pequeno'] as const) {
      const curto = layoutAdesivoA4(dados, tamanho)
      const longo = layoutAdesivoA4({ ...dados, nomeCapacete: 'MARQUINHOS DA OBRA' }, tamanho)
      expect(longo.linhas[0]!.altura).toBeLessThan(curto.linhas[0]!.altura)
      expect(longo.linhas[0]!.altura).toBeGreaterThanOrEqual(4)
      const ultima = longo.linhas.at(-1)!
      expect(ultima.y + ultima.altura).toBeLessThanOrEqual(longo.fio)
    }
  })
})
