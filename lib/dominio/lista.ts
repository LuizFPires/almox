import { contemTexto } from '@/lib/formatos/texto'
import { compararCodigos } from './cadastros'
import { ehPendencia } from './ficha'

export type ItemPessoa = {
  codigo: string
  tipo: string
  icone: string
  desde: string
  /** Valor de reposição, em centavos. */
  valor: number
}

export type PessoaLista = {
  id: string
  nome: string
  nomeCapacete: string
  funcao: string
  /** Inativa com ferramenta ainda aparece: a peça continua com ela. */
  ativa: boolean
  empresa: { id: string; nome: string; cor: string; tipo: 'propria' | 'empreiteira' }
  itens: ItemPessoa[]
}

export type GrupoEmpresa = {
  empresa: { id: string; nome: string; cor: string }
  /** `pendenteDesde`: o item mais antigo, quando é de antes de hoje (pendência). */
  pessoas: (PessoaLista & { pendenteDesde: string | null })[]
  totalItens: number
  /** Pessoas ativas da empresa sem ferramenta; 0 durante a busca (não se aplica). */
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
  // Pessoas separadas por empresa numa passada (antes, uma varredura por empresa).
  const porEmpresa = new Map<string, PessoaLista[]>()
  for (const p of pessoas) {
    const grupo = porEmpresa.get(p.empresa.id)
    if (grupo) grupo.push(p)
    else porEmpresa.set(p.empresa.id, [p])
  }
  return empresas
    .map((empresa) => {
      const daEmpresa = porEmpresa.get(empresa.id) ?? []
      const mostradas = daEmpresa
        .filter((p) => p.itens.length > 0 && bateBusca(p, busca))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((p) => {
          const maisAntigo = p.itens.reduce(
            (m, i) => (i.desde < m ? i.desde : m),
            p.itens[0]!.desde,
          )
          return {
            ...p,
            itens: [...p.itens].sort((a, b) => compararCodigos(a.codigo, b.codigo)),
            pendenteDesde: ehPendencia(maisAntigo, agora) ? maisAntigo : null,
          }
        })
      return {
        empresa,
        pessoas: mostradas,
        totalItens: mostradas.reduce((s, p) => s + p.itens.length, 0),
        semFerramenta: buscando
          ? 0
          : daEmpresa.filter((p) => p.ativa && p.itens.length === 0).length,
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

export type PendenciaPessoa = {
  pessoa: PessoaLista
  /** Peças com a pessoa desde antes de hoje, em ordem de código. */
  itens: ItemPessoa[]
  /** A peça mais antiga. */
  desde: string
  /** Soma do valor de reposição (centavos); só é descontado de empreiteira. */
  valor: number
  descontavel: boolean
}

/**
 * Aba "Não devolvidas": por pessoa (ordem alfabética), só as peças que ficaram de um dia para
 * o outro, com o total e quanto pode virar desconto (empreiteiras).
 */
export function pendenciasPorPessoa(pessoas: PessoaLista[], agora: Date) {
  const lista: PendenciaPessoa[] = pessoas
    .map((pessoa) => {
      const itens = pessoa.itens
        .filter((i) => ehPendencia(i.desde, agora))
        .sort((a, b) => compararCodigos(a.codigo, b.codigo))
      return {
        pessoa,
        itens,
        desde: itens.reduce((m, i) => (i.desde < m ? i.desde : m), itens[0]?.desde ?? ''),
        valor: itens.reduce((s, i) => s + i.valor, 0),
        descontavel: pessoa.empresa.tipo === 'empreiteira',
      }
    })
    .filter((p) => p.itens.length > 0)
    .sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'))
  return {
    lista,
    pecas: lista.reduce((s, p) => s + p.itens.length, 0),
    aDescontar: lista.filter((p) => p.descontavel).reduce((s, p) => s + p.valor, 0),
  }
}

export type AvariaLista = {
  id: string
  codigo: string
  tipo: string
  motivo: string | null
  detalhes: string | null
  quando: string | null
  devolvidaPor: string | null
  foto: string | null
  /** Avaria mais recente da peça (abre a tela da avaria). */
  avariaId?: string | null
  /** Indenização em centavos (ajustada ou, sem ajuste, a reposição). */
  valor?: number | null
}

/**
 * Aba "Avarias": peças em manutenção agrupadas por quem devolveu (ordem alfabética), a mais
 * recente primeiro. Peça sem avaria visível (outra empresa, para a consulta) fica de fora.
 */
export function avariasPorPessoa(pecas: AvariaLista[]) {
  const grupos = new Map<string, AvariaLista[]>()
  for (const p of pecas) {
    if (!p.devolvidaPor) continue
    grupos.set(p.devolvidaPor, [...(grupos.get(p.devolvidaPor) ?? []), p])
  }
  return [...grupos]
    .map(([pessoa, itens]) => ({
      pessoa,
      itens: itens.sort((a, b) => (b.quando ?? '').localeCompare(a.quando ?? '')),
    }))
    .sort((a, b) => a.pessoa.localeCompare(b.pessoa, 'pt-BR'))
}
