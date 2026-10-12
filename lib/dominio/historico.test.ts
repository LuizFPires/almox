import { describe, expect, it } from 'vitest'
import { lerFiltros, paraQuery, periodoValido, resumoItens, textoVia } from './historico'

const AGORA = new Date('2026-10-12T15:00:00-03:00')
const ID = '0b7c1d2e-3f40-4a5b-8c6d-7e8f90a1b2c3'

describe('lerFiltros', () => {
  it('padrão: últimos 7 dias, tudo', () => {
    expect(lerFiltros({}, AGORA)).toEqual({
      de: '2026-10-06',
      ate: '2026-10-12',
      pessoa: null,
      empresa: null,
      tipo: null,
      via: null,
      categoria: null,
    })
  })

  it('aceita filtros válidos e descarta o resto', () => {
    const f = lerFiltros(
      {
        de: '2026-10-01',
        ate: '2026-10-05',
        pessoa: ID,
        empresa: 'x',
        via: 'qr',
        categoria: 'bobagem',
      },
      AGORA,
    )
    expect(f).toMatchObject({
      de: '2026-10-01',
      ate: '2026-10-05',
      pessoa: ID,
      empresa: null,
      via: 'qr',
      categoria: null,
    })
  })

  it('data inexistente cai no padrão; período invertido é trocado', () => {
    expect(lerFiltros({ de: '2026-02-30' }, AGORA).de).toBe('2026-10-06')
    expect(lerFiltros({ de: '2026-10-10', ate: '2026-10-01' }, AGORA)).toMatchObject({
      de: '2026-10-01',
      ate: '2026-10-10',
    })
  })
})

describe('paraQuery e período', () => {
  it('só os filtros usados', () => {
    const f = lerFiltros({ de: '2026-10-01', ate: '2026-10-05', tipo: ID }, AGORA)
    expect(paraQuery(f)).toBe(`de=2026-10-01&ate=2026-10-05&tipo=${ID}`)
  })

  it('até um ano', () => {
    expect(periodoValido(lerFiltros({ de: '2025-10-12', ate: '2026-10-12' }, AGORA))).toBe(true)
    expect(periodoValido(lerFiltros({ de: '2025-01-01', ate: '2026-10-12' }, AGORA))).toBe(false)
  })
})

describe('linhas', () => {
  it('agrupa códigos por ferramenta e marca avaria', () => {
    expect(
      resumoItens([
        { tipo: 'Pá', codigo: 'PA-03', avariada: false },
        { tipo: 'Pá', codigo: 'PA-04', avariada: true },
        { tipo: 'Furadeira', codigo: 'FU-01', avariada: false },
      ]),
    ).toBe('Pá PA-03, PA-04 (avariada) · Furadeira FU-01')
  })

  it('via', () => {
    const base = {
      id: ID,
      quando: '',
      recebidoEm: null,
      pessoa: '',
      empresa: '',
      usuario: '',
      obs: null,
      estornoDe: null,
      itens: [],
    }
    expect(textoVia({ ...base, tipo: 'retirada', via: 'qr' })).toBe('QR do capacete')
    expect(textoVia({ ...base, tipo: 'devolucao', via: 'manual' })).toBe('manual · sem QR')
    expect(textoVia({ ...base, tipo: 'ocorrencia', via: null })).toBe(
      'capacete usado por outra pessoa',
    )
  })
})
