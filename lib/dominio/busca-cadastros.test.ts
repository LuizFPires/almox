import { describe, expect, it } from 'vitest'
import { buscarCadastros, hrefCadastro, type ItemBusca } from './busca-cadastros'

const INDICE: ItemBusca[] = [
  {
    tipo: 'pessoa',
    id: 'p1',
    nome: 'José Carlos Silva',
    detalhe: 'ZÉ CARLOS · Mestre · Construtora',
    termos: ['0060'],
  },
  {
    tipo: 'pessoa',
    id: 'p2',
    nome: 'Antônio Ferreira',
    detalhe: 'ANTÔNIO · Servente · Construtora',
    termos: ['0013'],
  },
  {
    tipo: 'pessoa',
    id: 'p3',
    nome: 'Adriano Costa',
    detalhe: 'ADRIANO · Servente · Elétrica Lumen',
    termos: [],
    inativo: true,
  },
  {
    tipo: 'pessoa',
    id: 'p4',
    nome: 'Abel Costa',
    detalhe: 'ABEL · Pintor · Construtora',
    termos: [],
  },
  { tipo: 'ferramenta', id: 'f1', nome: 'Serra circular', detalhe: '2 un.', termos: ['SER'] },
  { tipo: 'empresa', id: 'e1', nome: 'Construtora', detalhe: 'própria', termos: [] },
  { tipo: 'empresa', id: 'e2', nome: 'Elétrica Lumen', detalhe: 'empreiteira', termos: [] },
]

describe('buscarCadastros', () => {
  it('sem termo, não busca', () => {
    expect(buscarCadastros(INDICE, '   ')).toEqual([])
  })

  it('ignora acento e maiúsculas dos dois lados', () => {
    const [grupo] = buscarCadastros(INDICE, 'antonio')
    expect(grupo?.itens.map((i) => i.id)).toEqual(['p2'])
    expect(buscarCadastros(INDICE, 'ELETRICA').flatMap((g) => g.itens.map((i) => i.id))).toEqual([
      'p3',
      'e2',
    ])
  })

  it('acha por capacete, matrícula e código', () => {
    expect(buscarCadastros(INDICE, 'zé carlos')[0]?.itens[0]?.id).toBe('p1')
    expect(buscarCadastros(INDICE, '0013')[0]?.itens[0]?.id).toBe('p2')
    expect(buscarCadastros(INDICE, 'ser')[0]?.tipo).toBe('pessoa') // "Servente"
  })

  it('cada palavra precisa aparecer', () => {
    const ids = buscarCadastros(INDICE, 'costa servente').flatMap((g) => g.itens.map((i) => i.id))
    expect(ids).toEqual(['p3'])
  })

  it('agrupa em pessoas, ferramentas e empresas; ativos antes, depois por nome', () => {
    const resultado = buscarCadastros(INDICE, 'c')
    expect(resultado.map((g) => g.titulo)).toEqual(['Pessoas', 'Ferramentas', 'Empresas'])
    expect(resultado[0]?.itens.map((i) => i.id)).toEqual(['p4', 'p2', 'p1', 'p3'])
  })

  it('aponta para o cadastro do item', () => {
    expect(hrefCadastro({ tipo: 'ferramenta', id: 'f1' })).toBe('/cadastros/ferramenta/f1')
    expect(hrefCadastro({ tipo: 'pessoa', id: 'p1' })).toBe('/cadastros/pessoa/p1')
  })
})
