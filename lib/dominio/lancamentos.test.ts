import { describe, expect, it } from 'vitest'
import { descreverLancamento, maisRecentes, type Lancamento } from './lancamentos'

const pa = { nome: 'Pá', codigo: 'PA-03' }

describe('últimos lançamentos', () => {
  it('retirada de uma peça mostra o nome e o código', () => {
    expect(
      descreverLancamento({
        tipo: 'retirada',
        quando: '',
        pessoa: 'Renato',
        via: 'qr',
        itens: [pa],
      }),
    ).toEqual({ texto: 'retirou Pá PA-03', alerta: false })
  })

  it('várias peças viram contagem; manual fica em destaque', () => {
    expect(
      descreverLancamento({
        tipo: 'devolucao',
        quando: '',
        pessoa: 'Renato',
        via: 'manual',
        itens: [pa, pa, pa],
      }),
    ).toEqual({ texto: 'devolveu 3 itens · manual', alerta: true })
  })

  it('ocorrência: bloqueado', () => {
    expect(descreverLancamento({ tipo: 'ocorrencia', quando: '', pessoa: 'Joaquim' })).toEqual({
      texto: 'Bloqueado: capacete usado por outra pessoa',
      alerta: true,
    })
  })

  it('junta e ordena do mais novo para o mais velho', () => {
    const l = (quando: string): Lancamento => ({ tipo: 'ocorrencia', quando, pessoa: quando })
    expect(
      maisRecentes(
        [l('2026-10-11T10:00:00Z'), l('2026-10-11T12:00:00Z'), l('2026-10-11T11:00:00Z')],
        2,
      ).map((x) => x.quando),
    ).toEqual(['2026-10-11T12:00:00Z', '2026-10-11T11:00:00Z'])
  })
})
