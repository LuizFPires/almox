import { describe, expect, it } from 'vitest'
import { validarImportacao, type Existentes, type Planilha } from './importacao'

const ICONES = [
  { chave: 'pa', nome: 'Pá' },
  { chave: 'martelete', nome: 'Martelete' },
]
const EXISTENTES: Existentes = {
  empresas: ['Construtora'],
  pessoas: [{ nome: 'Joaquim Silva', empresa: 'Construtora' }],
  capacetes: ['JOAQUIM', 'JOÃO'],
  ferramentas: ['Pá'],
  prefixos: ['PA'],
}
const vazio: Planilha = { empresas: [], pessoas: [], ferramentas: [] }

describe('validarImportacao', () => {
  it('importa empresas, pessoas e ferramentas válidas', () => {
    const r = validarImportacao(
      {
        empresas: [['Fôrmas Ribeiro', 'Empreiteira', 'Roberto', 'DONO@formas.com.br', '']],
        pessoas: [
          ['João Batista', '', 'Pedreiro', 'fôrmas ribeiro'],
          ['Ana Souza', 'aninha', 'Servente', 'Construtora'],
        ],
        ferramentas: [['Martelete Bosch', 'martelete', '', '2.890,00', '3', 'sim']],
      },
      EXISTENTES,
      ICONES,
    )
    expect(r.erros).toEqual([])
    expect(r.empresas).toEqual([
      {
        linha: 2,
        nome: 'Fôrmas Ribeiro',
        tipo: 'empreiteira',
        donoNome: 'Roberto',
        donoEmail: 'dono@formas.com.br',
        encarregadoEmail: null,
      },
    ])
    // JOÃO já existe: sugere com a inicial do sobrenome; empresa com o nome cadastrado.
    expect(r.pessoas.map((p) => [p.nomeCapacete, p.empresa])).toEqual([
      ['JOÃO B.', 'Fôrmas Ribeiro'],
      ['ANINHA', 'Construtora'],
    ])
    expect(r.ferramentas).toEqual([
      {
        linha: 2,
        nome: 'Martelete Bosch',
        icone: 'martelete',
        prefixo: 'MAR',
        valor: 289000,
        quantidade: 3,
        altoValor: true,
      },
    ])
  })

  it('erros por linha, com a aba', () => {
    const r = validarImportacao(
      {
        empresas: [['Elétrica X', 'Terceirizada', '', 'x@', '']],
        pessoas: [
          ['Zé', '', 'Pedreiro', 'Construtora'],
          ['Maria Lima', '', '', 'Inexistente'],
        ],
        ferramentas: [
          ['Pá', 'pa', '', '10,00', '1', ''],
          ['Serra', 'serrote', '', '10,00', '1', ''],
          ['Escada', 'pa', 'PA', '10,00', '1', ''],
          ['Lixadeira', 'pa', '', 'abc', '1', ''],
          ['Trena', 'pa', '', '10,00', '0', ''],
        ],
      },
      EXISTENTES,
      ICONES,
    )
    expect(r.erros.map((e) => `${e.aba}:${e.linha}`)).toEqual([
      'Empresas:2',
      'Pessoas:2',
      'Pessoas:3',
      'Ferramentas:2',
      'Ferramentas:3',
      'Ferramentas:4',
      'Ferramentas:5',
      'Ferramentas:6',
    ])
    expect(r.erros[0]?.texto).toBe('Tipo: use Empreiteira ou Própria.')
    expect(r.erros[2]?.texto).toBe('Empresa "Inexistente" não está na aba Empresas nem na obra.')
  })

  it('já cadastradas são puladas com aviso; linhas vazias ignoradas; repetida no arquivo é erro', () => {
    const r = validarImportacao(
      {
        ...vazio,
        empresas: [['construtora'], ['', '', ''], ['Nova', 'Própria'], ['NOVA', '']],
        pessoas: [['Joaquim Silva', '', 'Pedreiro', 'Construtora']],
      },
      EXISTENTES,
      ICONES,
    )
    expect(r.avisos.map((a) => a.texto)).toEqual([
      '"construtora" já está cadastrada: pulada.',
      '"Joaquim Silva" já está cadastrada em Construtora: pulada.',
    ])
    expect(r.empresas.map((e) => [e.nome, e.tipo])).toEqual([['Nova', 'propria']])
    expect(r.erros).toEqual([{ aba: 'Empresas', linha: 5, texto: '"NOVA" aparece duas vezes.' }])
  })
})
