export type StatusAviso = 'enviado' | 'cancelado' | 'confirmado'
export type StatusDesconto = 'aberto' | 'cancelado' | 'confirmado'

/** Rótulo e tom de cada situação do aviso (RN-14 e fechamento da medição). */
export function rotuloStatusAviso(status: StatusAviso): {
  texto: string
  tom: 'aviso' | 'sucesso' | 'erro'
} {
  switch (status) {
    case 'enviado':
      return { texto: 'A descontar na próxima medição', tom: 'erro' }
    case 'cancelado':
      return { texto: 'Cancelado: ferramentas devolvidas', tom: 'sucesso' }
    case 'confirmado':
      return { texto: 'Descontado na medição', tom: 'aviso' }
  }
}

export function rotuloStatusDesconto(status: StatusDesconto): string {
  return status === 'aberto' ? 'em aberto' : status === 'cancelado' ? 'devolvida' : 'descontada'
}

/**
 * Valor ainda em aberto do aviso: só as peças com desconto em aberto (as devolvidas saem
 * peça a peça; o total do aviso é o do dia em que foi enviado).
 */
export function totalEmAberto(
  itens: { codigo: string; valor: number }[],
  descontos: { codigo: string; status: StatusDesconto }[],
): number {
  const aberto = new Set(descontos.filter((d) => d.status === 'aberto').map((d) => d.codigo))
  return itens.filter((i) => aberto.has(i.codigo)).reduce((s, i) => s + i.valor, 0)
}
