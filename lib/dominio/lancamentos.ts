import { diaDaObra, formatarHora } from '@/lib/formatos/datas'

/** Linha do registro de movimentações do Início (F-01): retirada, devolução ou ocorrência. */
export type Lancamento =
  | {
      /** Movimento (abre o detalhe, com estorno para o engenheiro). */
      id?: string
      tipo: 'retirada' | 'devolucao' | 'estorno'
      quando: string
      pessoa: string
      via: 'qr' | 'manual'
      /** Login que lançou (null: saiu da obra e o nome não aparece mais). */
      usuario: string | null
      itens: { nome: string; codigo: string }[]
    }
  | {
      tipo: 'ocorrencia'
      quando: string
      /** Dono do capacete que foi usado por outra pessoa. */
      pessoa: string
      /** Login que leu o QR e marcou "Não é ele". */
      usuario: string | null
    }

const ACAO = { retirada: 'Retirou', devolucao: 'Devolveu', estorno: 'Estorno de' } as const

export type Registro = {
  /** "Retirou", "Devolveu", "Estorno de", "Não é ele". */
  acao: string
  /** Todas as ferramentas ("Pá PA-03, Enxada ENX-01") ou o que aconteceu. */
  detalhe: string
  /** Como a pessoa foi identificada. */
  origem: 'QR lido' | 'sem QR (pela lista)'
  /** "por Sebastião Nunes" (ou "por login removido"). */
  quem: string
  /** Retirada sem QR e bloqueio ficam em destaque. */
  alerta: boolean
}

/** Uma linha do registro: quem lançou, como identificou a pessoa e as ferramentas. */
export function descreverRegistro(l: Lancamento): Registro {
  const quem = `por ${l.usuario ?? 'login removido'}`
  if (l.tipo === 'ocorrencia') {
    return {
      acao: 'Não é ele',
      detalhe: 'Capacete usado por outra pessoa · nada registrado',
      origem: 'QR lido',
      quem,
      alerta: true,
    }
  }
  const manual = l.via === 'manual'
  return {
    acao: ACAO[l.tipo],
    detalhe: l.itens.map((i) => `${i.nome} ${i.codigo}`.trim()).join(', '),
    origem: manual ? 'sem QR (pela lista)' : 'QR lido',
    quem,
    alerta: manual,
  }
}

/** "hoje 14:20", "ontem 08:05" ou "12/10 17:40", no fuso da obra. */
export function quandoCurto(quando: string, agora: Date): string {
  const dia = diaDaObra(quando)
  const hora = formatarHora(quando)
  if (dia === diaDaObra(agora)) return `hoje ${hora}`
  if (dia === diaDaObra(new Date(agora.getTime() - 24 * 60 * 60 * 1000))) return `ontem ${hora}`
  const [, mes, d] = dia.split('-')
  return `${d}/${mes} ${hora}`
}

/** Junta movimentos e ocorrências e fica com os mais recentes. */
export function maisRecentes(lancamentos: Lancamento[], limite = 10): Lancamento[] {
  return [...lancamentos].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, limite)
}
