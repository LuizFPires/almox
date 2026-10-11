import { compararCodigos } from './cadastros'
import { ehPendencia } from './ficha'

export type UnidadeEstoque = {
  id: string
  codigo: string
  status: 'livre' | 'em_uso' | 'manutencao' | 'baixada'
}

export type PosseVisivel = { unidadeId: string; pessoa: string; desde: string }

export type TipoEstoque = { id: string; nome: string; icone: string; unidades: UnidadeEstoque[] }

export type LinhaComQuem =
  | { tipo: 'pessoa'; codigo: string; pessoa: string; desde: string; pendente: boolean }
  | { tipo: 'manutencao'; codigo: string }

export type ResumoTipo = {
  id: string
  nome: string
  icone: string
  total: number
  livres: number
  noCanteiro: number
  manutencao: number
  /** Em uso com pessoas que este usuário não vê (consulta de empreiteira). */
  comOutrasEmpresas: number
  linhas: LinhaComQuem[]
}

/**
 * Estoque (F-09) por tipo. Unidade com baixa não conta. "Com quem" só para posses que a
 * RLS deixa ver; as demais em uso viram "com outras empresas" (sem nome).
 */
export function resumirEstoque(
  tipos: TipoEstoque[],
  posses: PosseVisivel[],
  agora: Date,
): {
  totais: { total: number; livres: number; noCanteiro: number; manutencao: number }
  tipos: ResumoTipo[]
} {
  const porUnidade = new Map(posses.map((p) => [p.unidadeId, p]))
  const resumos = tipos.map((t): ResumoTipo => {
    const ativas = t.unidades.filter((u) => u.status !== 'baixada')
    const emUso = ativas.filter((u) => u.status === 'em_uso')
    const linhas: LinhaComQuem[] = []
    let comOutras = 0
    for (const u of [...emUso].sort((a, b) => compararCodigos(a.codigo, b.codigo))) {
      const p = porUnidade.get(u.id)
      if (p) {
        linhas.push({
          tipo: 'pessoa',
          codigo: u.codigo,
          pessoa: p.pessoa,
          desde: p.desde,
          pendente: ehPendencia(p.desde, agora),
        })
      } else {
        comOutras++
      }
    }
    for (const u of ativas
      .filter((x) => x.status === 'manutencao')
      .sort((a, b) => compararCodigos(a.codigo, b.codigo))) {
      linhas.push({ tipo: 'manutencao', codigo: u.codigo })
    }
    return {
      id: t.id,
      nome: t.nome,
      icone: t.icone,
      total: ativas.length,
      livres: ativas.filter((u) => u.status === 'livre').length,
      noCanteiro: emUso.length,
      manutencao: ativas.filter((u) => u.status === 'manutencao').length,
      comOutrasEmpresas: comOutras,
      linhas,
    }
  })
  const soma = (f: (r: ResumoTipo) => number) => resumos.reduce((s, r) => s + f(r), 0)
  return {
    totais: {
      total: soma((r) => r.total),
      livres: soma((r) => r.livres),
      noCanteiro: soma((r) => r.noCanteiro),
      manutencao: soma((r) => r.manutencao),
    },
    tipos: resumos,
  }
}

/** "2 no canteiro · 1 manutenção · toque para ver com quem". */
export function subtituloTipo(r: ResumoTipo): string {
  return `${r.noCanteiro} no canteiro${r.manutencao ? ` · ${r.manutencao} manutenção` : ''} · toque para ver com quem`
}
