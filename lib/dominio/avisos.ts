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

export type DescontoDoAviso = {
  codigo: string
  valor: number
  status: StatusDesconto
  primeiroAvisoId: string | null
}

/**
 * Valor que o aviso cobra de fato: só as peças que ele cobrou pela primeira vez (o lembrete
 * dos dias seguintes não soma de novo). A descontar: as em aberto; descontado: as confirmadas.
 * Sem peça nova, é um lembrete.
 */
export function valorDoAviso(
  avisoId: string,
  status: StatusAviso,
  descontos: DescontoDoAviso[],
): { lembrete: boolean; valor: number } {
  const proprios = descontos.filter((d) => d.primeiroAvisoId === avisoId)
  const conta = status === 'confirmado' ? 'confirmado' : 'aberto'
  return {
    lembrete: proprios.length === 0,
    valor: proprios.filter((d) => d.status === conta).reduce((s, d) => s + d.valor, 0),
  }
}
