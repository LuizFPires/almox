import { describe, expect, it } from 'vitest'
import { resumirEstoque, subtituloTipo, type TipoEstoque } from './estoque'
import {
  agruparPorEmpresa,
  bateBusca,
  resumoGrupo,
  textoSemFerramenta,
  type PessoaLista,
} from './lista'

const agora = new Date('2026-10-11T12:00:00Z')
const construtora = { id: 'c', nome: 'Construtora', cor: '#F4B400' }
const formas = { id: 'f', nome: 'Fôrmas Ribeiro', cor: '#FF8A3D' }
const pessoa = (
  id: string,
  nome: string,
  empresa: typeof construtora,
  itens: [string, string][] = [],
  ativa = true,
): PessoaLista => ({
  id,
  nome,
  ativa,
  nomeCapacete: nome.split(' ')[0]!.toUpperCase(),
  funcao: 'Pedreiro',
  empresa,
  itens: itens.map(([codigo, desde]) => ({ codigo, tipo: 'Martelete', icone: 'martelete', desde })),
})

const pessoas = [
  pessoa('1', 'João Souza', construtora, [['MT-02', '2026-10-11T10:00:00Z']]),
  pessoa('2', 'Raimundo Alves', construtora, [['MT-01', '2026-10-10T19:40:00Z']]),
  pessoa('3', 'Pedro Lima', construtora),
  pessoa('4', 'Hélio Moreira', formas, [
    ['PA-10', '2026-10-11T10:00:00Z'],
    ['PA-02', '2026-10-11T10:00:00Z'],
  ]),
]

describe('quem está com o quê', () => {
  it('por empresa, só quem tem ferramenta, com "sem ferramenta" contado', () => {
    const g = agruparPorEmpresa(pessoas, [construtora, formas], '', agora)
    expect(
      g.map((x) => [x.empresa.nome, x.pessoas.map((p) => p.nome), x.totalItens, x.semFerramenta]),
    ).toEqual([
      ['Construtora', ['João Souza', 'Raimundo Alves'], 2, 1],
      ['Fôrmas Ribeiro', ['Hélio Moreira'], 2, 0],
    ])
  })

  it('pendência de outro dia em vermelho', () => {
    const g = agruparPorEmpresa(pessoas, [construtora], '', agora)
    expect(g[0]?.pessoas.find((p) => p.nome === 'Raimundo Alves')?.pendenteDesde).toBe(
      '2026-10-10T19:40:00Z',
    )
    expect(g[0]?.pessoas.find((p) => p.nome === 'João Souza')?.pendenteDesde).toBeNull()
  })

  it('inativa com ferramenta aparece; inativa sem ferramenta não conta; ordem pt-BR', () => {
    const g = agruparPorEmpresa(
      [
        ...pessoas,
        pessoa('5', 'Ângelo Dias', construtora, [['PA-01', '2026-10-11T10:00:00Z']], false),
        pessoa('6', 'Zeca Antigo', construtora, [], false),
      ],
      [construtora],
      '',
      agora,
    )
    expect(g[0]?.pessoas.map((p) => p.nome)).toEqual([
      'Ângelo Dias',
      'João Souza',
      'Raimundo Alves',
    ])
    expect(g[0]?.semFerramenta).toBe(1)
  })

  it('itens em ordem de código', () => {
    const g = agruparPorEmpresa(pessoas, [formas], '', agora)
    expect(g[0]?.pessoas[0]?.itens.map((i) => i.codigo)).toEqual(['PA-02', 'PA-10'])
  })

  it('busca "joao" acha "João"; "MT-02" acha quem está com ele', () => {
    expect(bateBusca(pessoas[0]!, 'joao')).toBe(true)
    expect(bateBusca(pessoas[0]!, 'mt-02')).toBe(true)
    expect(bateBusca(pessoas[1]!, 'MT-02')).toBe(false)
    const g = agruparPorEmpresa(pessoas, [construtora, formas], 'MT-02', agora)
    expect(g.map((x) => x.pessoas.map((p) => p.nome))).toEqual([['João Souza']])
    // "sem ferramenta" não se aplica durante a busca
    expect(g[0]?.semFerramenta).toBe(0)
  })

  it('busca pelo apelido do capacete', () => {
    expect(bateBusca(pessoas[3]!, 'helio')).toBe(true)
  })

  it('textos', () => {
    expect(resumoGrupo(1, 1)).toBe('1 item · 1 pessoa')
    expect(resumoGrupo(3, 2)).toBe('3 itens · 2 pessoas')
    expect(textoSemFerramenta(1)).toBe('+ 1 pessoa sem ferramenta')
    expect(textoSemFerramenta(4)).toBe('+ 4 pessoas sem ferramenta')
  })
})

describe('estoque', () => {
  const tipos: TipoEstoque[] = [
    {
      id: 'mt',
      nome: 'Martelete',
      icone: 'martelete',
      unidades: [
        { id: 'u1', codigo: 'MT-01', status: 'em_uso' },
        { id: 'u2', codigo: 'MT-02', status: 'em_uso' },
        { id: 'u3', codigo: 'MT-03', status: 'manutencao' },
        { id: 'u4', codigo: 'MT-04', status: 'livre' },
        { id: 'u5', codigo: 'MT-05', status: 'baixada' },
      ],
    },
  ]

  it('totais sem as unidades com baixa', () => {
    const r = resumirEstoque(tipos, [], agora)
    expect(r.totais).toEqual({ total: 4, livres: 1, noCanteiro: 2, manutencao: 1 })
  })

  it('com quem: nome e código; sem acesso ao nome = outras empresas', () => {
    const r = resumirEstoque(
      tipos,
      [{ unidadeId: 'u1', pessoa: 'Raimundo Alves', desde: '2026-10-10T19:40:00Z' }],
      agora,
    )
    const t = r.tipos[0]!
    expect(t.linhas).toEqual([
      {
        tipo: 'pessoa',
        codigo: 'MT-01',
        pessoa: 'Raimundo Alves',
        desde: '2026-10-10T19:40:00Z',
        pendente: true,
      },
      { tipo: 'manutencao', codigo: 'MT-03' },
    ])
    expect(t.comOutrasEmpresas).toBe(1)
    expect(subtituloTipo(t)).toBe('2 no canteiro · 1 manutenção · toque para ver com quem')
  })
})
