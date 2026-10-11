/** Linha de "Últimos lançamentos" (F-01): retirada, devolução ou ocorrência. */
export type Lancamento =
  | {
      /** Movimento (abre o detalhe, com estorno para o engenheiro). */
      id?: string
      tipo: 'retirada' | 'devolucao' | 'estorno'
      quando: string
      pessoa: string
      via: 'qr' | 'manual'
      itens: { nome: string; codigo: string }[]
    }
  | { tipo: 'ocorrencia'; quando: string; pessoa: string }

const VERBO = { retirada: 'retirou', devolucao: 'devolveu', estorno: 'estorno de' } as const

/** "retirou Pá PA-03", "devolveu 3 itens · manual", "Bloqueado: capacete usado por outra pessoa". */
export function descreverLancamento(l: Lancamento): { texto: string; alerta: boolean } {
  if (l.tipo === 'ocorrencia') {
    return { texto: 'Bloqueado: capacete usado por outra pessoa', alerta: true }
  }
  const [unico] = l.itens
  const objeto =
    l.itens.length === 1 && unico ? `${unico.nome} ${unico.codigo}` : `${l.itens.length} itens`
  const manual = l.via === 'manual'
  return { texto: `${VERBO[l.tipo]} ${objeto}${manual ? ' · manual' : ''}`, alerta: manual }
}

/** Junta movimentos e ocorrências e fica com os mais recentes. */
export function maisRecentes(lancamentos: Lancamento[], limite = 5): Lancamento[] {
  return [...lancamentos].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, limite)
}
