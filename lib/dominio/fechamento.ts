import { ehPendencia } from './ficha'

/** Uma peça fora agora (posse), com o valor de reposição vigente em centavos. */
export type PosseFechamento = {
  pessoaId: string
  pessoa: string
  empresa: { nome: string; cor: string; propria: boolean }
  tipo: string
  valor: number
  desde: string
}

/** Última devolução de hoje de cada pessoa. */
export type DevolucaoHoje = {
  pessoaId: string
  pessoa: string
  empresa: string
  quando: string
}

export type PendenteFechamento = {
  pessoaId: string
  nome: string
  empresa: { nome: string; cor: string; propria: boolean }
  /** "Colher ×1, Régua ×1": por tipo, na ordem em que saíram. */
  itens: string
  valor: number
  desdeOntem: boolean
}

export type Fechamento = {
  unidadesFora: number
  pendentes: PendenteFechamento[]
  devolveramTudo: { pessoaId: string; nome: string; empresa: string; quando: string }[]
}

/**
 * Fechamento do dia (F-10): quem ainda está com ferramenta (qualquer dia, qualquer via), com o
 * valor das peças, e quem devolveu tudo hoje (devolveu e está sem nada agora).
 * Construtora primeiro, depois as empreiteiras; dentro, por nome.
 */
export function montarFechamento(
  posses: PosseFechamento[],
  devolucoes: DevolucaoHoje[],
  agora: Date,
): Fechamento {
  const porPessoa = new Map<string, PosseFechamento[]>()
  for (const p of [...posses].sort((a, b) => a.desde.localeCompare(b.desde))) {
    porPessoa.set(p.pessoaId, [...(porPessoa.get(p.pessoaId) ?? []), p])
  }
  const pendentes = [...porPessoa.values()]
    .map((pecas): PendenteFechamento => {
      const tipos = new Map<string, number>()
      for (const p of pecas) tipos.set(p.tipo, (tipos.get(p.tipo) ?? 0) + 1)
      const primeira = pecas[0]!
      return {
        pessoaId: primeira.pessoaId,
        nome: primeira.pessoa,
        empresa: primeira.empresa,
        itens: [...tipos.entries()].map(([t, n]) => `${t} ×${n}`).join(', '),
        valor: pecas.reduce((s, p) => s + p.valor, 0),
        desdeOntem: pecas.some((p) => ehPendencia(p.desde, agora)),
      }
    })
    .sort(
      (a, b) =>
        Number(b.empresa.propria) - Number(a.empresa.propria) ||
        a.empresa.nome.localeCompare(b.empresa.nome, 'pt-BR') ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    )
  const devolveramTudo = devolucoes
    .filter((d) => !porPessoa.has(d.pessoaId))
    .map((d) => ({ pessoaId: d.pessoaId, nome: d.pessoa, empresa: d.empresa, quando: d.quando }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return { unidadesFora: posses.length, pendentes, devolveramTudo }
}

/** "Todos devolveram" / "1 pessoa ainda com ferramenta" / "3 pessoas ainda com ferramenta". */
export function resumoFechamento(pendentes: number): string {
  if (pendentes === 0) return 'Todos devolveram'
  return `${pendentes} ${pendentes === 1 ? 'pessoa ainda' : 'pessoas ainda'} com ferramenta`
}

/** "1 pendência passa para amanhã" / "Sem pendências". */
export function subtituloEncerrado(pendentes: number): string {
  if (pendentes === 0) return 'Sem pendências'
  return pendentes === 1
    ? '1 pendência passa para amanhã'
    : `${pendentes} pendências passam para amanhã`
}

/** "Aviso a Luciana e Carlos" (primeiro nome; sem nome cadastrado, o papel). */
export function destinatariosAviso(dono: string | null, encarregado: string | null): string {
  const primeiro = (n: string | null) => n?.trim().split(/\s+/)[0] ?? null
  const nomes = [primeiro(dono) ?? 'dono', primeiro(encarregado) ?? 'encarregado']
  return `Aviso a ${[...new Set(nomes)].join(' e ')}`
}
