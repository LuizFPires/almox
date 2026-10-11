import { describe, expect, it } from 'vitest'
import { filtrarPessoas } from './busca'

const pessoas = [
  { nome: 'José Carlos Teixeira', nome_capacete: 'ZÉ CARLOS' },
  { nome: 'Antônio Ferreira', nome_capacete: 'TONHO' },
  { nome: 'Joaquim Silva', nome_capacete: 'JOAQUIM' },
]

describe('busca da lista manual', () => {
  it('sem busca mostra todos', () => {
    expect(filtrarPessoas(pessoas, '  ')).toHaveLength(3)
  })

  it('ignora acentos e maiúsculas dos dois lados', () => {
    expect(filtrarPessoas(pessoas, 'antonio').map((p) => p.nome)).toEqual(['Antônio Ferreira'])
    expect(filtrarPessoas(pessoas, 'JOSÉ').map((p) => p.nome)).toEqual(['José Carlos Teixeira'])
  })

  it('acha pelo nome no capacete (apelido)', () => {
    expect(filtrarPessoas(pessoas, 'tonho').map((p) => p.nome)).toEqual(['Antônio Ferreira'])
    expect(filtrarPessoas(pessoas, 'ze car').map((p) => p.nome)).toEqual(['José Carlos Teixeira'])
  })

  it('pedaço do nome no meio também acha', () => {
    expect(filtrarPessoas(pessoas, 'silva').map((p) => p.nome)).toEqual(['Joaquim Silva'])
  })
})
