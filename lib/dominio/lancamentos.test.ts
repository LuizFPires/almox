import { describe, expect, it } from 'vitest'
import { descreverRegistro, maisRecentes, quandoCurto, type Lancamento } from './lancamentos'

const pa = { nome: 'Pá', codigo: 'PA-03' }
const enxada = { nome: 'Enxada', codigo: 'ENX-01' }

describe('registro de movimentações', () => {
  it('retirada com QR: todas as ferramentas e quem lançou', () => {
    expect(
      descreverRegistro({
        tipo: 'retirada',
        quando: '',
        pessoa: 'Renato',
        via: 'qr',
        usuario: 'Sebastião Nunes',
        itens: [pa, enxada],
      }),
    ).toEqual({
      acao: 'Retirou',
      detalhe: 'Pá PA-03, Enxada ENX-01',
      origem: 'QR lido',
      quem: 'por Sebastião Nunes',
      alerta: false,
    })
  })

  it('sem QR fica em destaque; login que saiu da obra aparece como removido', () => {
    const r = descreverRegistro({
      tipo: 'devolucao',
      quando: '',
      pessoa: 'Renato',
      via: 'manual',
      usuario: null,
      itens: [pa],
    })
    expect(r).toMatchObject({
      acao: 'Devolveu',
      origem: 'sem QR (pela lista)',
      quem: 'por login removido',
      alerta: true,
    })
  })

  it('"Não é ele": quem leu o QR e que nada foi registrado', () => {
    expect(
      descreverRegistro({ tipo: 'ocorrencia', quando: '', pessoa: 'Joaquim', usuario: 'Helena' }),
    ).toEqual({
      acao: 'Não é ele',
      detalhe: 'Capacete usado por outra pessoa · nada registrado',
      origem: 'QR lido',
      quem: 'por Helena',
      alerta: true,
    })
  })

  it('dia e hora no fuso da obra: hoje, ontem ou a data', () => {
    const agora = new Date('2026-10-13T15:00:00Z') // 12:00 em São Paulo
    expect(quandoCurto('2026-10-13T17:20:00Z', agora)).toBe('hoje 14:20')
    expect(quandoCurto('2026-10-13T02:30:00Z', agora)).toBe('ontem 23:30')
    expect(quandoCurto('2026-10-10T20:40:00Z', agora)).toBe('10/10 17:40')
  })

  it('junta e ordena do mais novo para o mais velho', () => {
    const l = (quando: string): Lancamento => ({
      tipo: 'ocorrencia',
      quando,
      pessoa: quando,
      usuario: null,
    })
    expect(
      maisRecentes(
        [l('2026-10-11T10:00:00Z'), l('2026-10-11T12:00:00Z'), l('2026-10-11T11:00:00Z')],
        2,
      ).map((x) => x.quando),
    ).toEqual(['2026-10-11T12:00:00Z', '2026-10-11T11:00:00Z'])
  })
})
