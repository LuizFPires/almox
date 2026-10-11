import { contemTexto } from '@/lib/formatos/texto'
import { compararCodigos } from './cadastros'
import { ehPendencia } from './ficha'

export type ItemPessoa = { codigo: string; tipo: string; icone: string; desde: string }

export type PessoaLista = {
  id: string
  nome: string
  nomeCapacete: string
  funcao: string
  empresa: { id: string; nome: string; cor: string }
  itens: ItemPessoa[]
}

export type GrupoEmpresa = {
  empresa: { id: string; nome: string; cor: string }
  pessoas: (PessoaLista & { pendente: boolean })[]
  totalItens: number
  /** Da empresa, sem ferramenta (ou fora da busca). */
  semFerramenta: number
}

/** A pessoa bate com a busca: nome, apelido do capacete ou código de peça, sem acento. */
export function bateBusca(p: PessoaLista, busca: string): boolean {
  const b = busca.trim()
  if (!b) return true
  return (
    contemTexto(p.nome, b) ||
    contemTexto(p.nomeCapacete, b) ||
    p.itens.some((i) => contemTexto(i.codigo, b))
  )
}

/**
 * "Quem está com o quê" (F-07): por empresa, só quem tem ferramenta e bate com a busca;
 * itens em ordem de código; empresas na ordem recebida (sem grupos vazios ao buscar).
 */
export function agruparPorEmpresa(
  pessoas: PessoaLista[],
  empresas: { id: string; nome: string; cor: string }[],
  busca: string,
  agora: Date,
): GrupoEmpresa[] {
  const buscando = busca.trim().length > 0
  return empresas
    .map((empresa) => {
      const daEmpresa = pessoas.filter((p) => p.empresa.id === empresa.id)
      const mostradas = daEmpresa
        .filter((p) => p.itens.length > 0 && bateBusca(p, busca))
        .map((p) => ({
          ...p,
          itens: [...p.itens].sort((a, b) => compararCodigos(a.codigo, b.codigo)),
          pendente: p.itens.some((i) => ehPendencia(i.desde, agora)),
        }))
      return {
        empresa,
        pessoas: mostradas,
        totalItens: mostradas.reduce((s, p) => s + p.itens.length, 0),
        semFerramenta: daEmpresa.length - mostradas.length,
      }
    })
    .filter((g) => g.pessoas.length > 0 || (!buscando && g.semFerramenta > 0))
}

/** "3 itens · 2 pessoas". */
export function resumoGrupo(itens: number, pessoas: number): string {
  return `${itens} ${itens === 1 ? 'item' : 'itens'} · ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}`
}

/** "+ 4 pessoas sem ferramenta". */
export function textoSemFerramenta(n: number): string {
  return `+ ${n} ${n === 1 ? 'pessoa sem ferramenta' : 'pessoas sem ferramenta'}`
}
