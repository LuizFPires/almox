import { describe, expect, it } from 'vitest'
import { resumirEstoque, subtituloTipo, type TipoEstoque } from './estoque'
import {
  agruparPorEmpresa,
  avariasPorPessoa,
  pendenciasPorPessoa,
  bateBusca,
  resumoGrupo,
  textoSemFerramenta,
  type PessoaLista,
} from './lista'

const agora = new Date('2026-10-11T12:00:00Z')
const construtora = { id: 'c', nome: 'Construtora', cor: '#F4B400', tipo: 'propria' as const }
const formas = {
  id: 'f',
  nome: 'Fôrmas Ribeiro',
  cor: '#FF8A3D',
  tipo: 'empreiteira' as const,
}
const pessoa = (
  id: string,
  nome: string,
  empresa: PessoaLista['empresa'],
  itens: [string, string][] = [],
  ativa = true,
): PessoaLista => ({
  id,
  nome,
  ativa,
  nomeCapacete: nome.split(' ')[0]!.toUpperCase(),
  funcao: 'Pedreiro',
  empresa,
  itens: itens.map(([codigo, desde]) => ({
    codigo,
    tipo: 'Martelete',
    icone: 'martelete',
    desde,
    valor: 289000,
  })),
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

describe('aba Não devolvidas', () => {
  it('só peças de antes de hoje, por pessoa, com o total a descontar das empreiteiras', () => {
    const lista = [
      ...pessoas,
      pessoa('5', 'Antônio Ferreira', formas, [
        ['PA-07', '2026-10-10T19:40:00Z'],
        ['MT-03', '2026-10-10T19:40:00Z'],
        ['PA-09', '2026-10-11T09:00:00Z'],
      ]),
    ]
    const r = pendenciasPorPessoa(lista, agora)
    expect(
      r.lista.map((p) => [p.pessoa.nome, p.itens.map((i) => i.codigo), p.descontavel]),
    ).toEqual([
      ['Antônio Ferreira', ['MT-03', 'PA-07'], true],
      ['Raimundo Alves', ['MT-01'], false],
    ])
    expect(r.pecas).toBe(3)
    // Só a empreiteira entra no "a descontar" (2 peças × R$ 2.890,00).
    expect(r.aDescontar).toBe(578000)
    expect(r.lista[0]?.desde).toBe('2026-10-10T19:40:00Z')
  })
})

describe('aba Avarias', () => {
  it('por quem devolveu, a mais recente primeiro; sem pessoa visível fica de fora', () => {
    const peca = (id: string, devolvidaPor: string | null, quando: string) => ({
      id,
      codigo: id,
      tipo: 'Pá',
      motivo: 'quebrada',
      detalhes: null,
      quando,
      devolvidaPor,
      foto: null,
    })
    const g = avariasPorPessoa([
      peca('PA-01', 'Wagner Pinto', '2026-10-10T10:00:00Z'),
      peca('PA-02', 'Valter Gomes', '2026-10-11T10:00:00Z'),
      peca('PA-03', 'Wagner Pinto', '2026-10-11T08:00:00Z'),
      peca('PA-04', null, '2026-10-11T09:00:00Z'),
    ])
    expect(g.map((x) => [x.pessoa, x.itens.map((i) => i.codigo)])).toEqual([
      ['Valter Gomes', ['PA-02']],
      ['Wagner Pinto', ['PA-03', 'PA-01']],
    ])
  })
})
