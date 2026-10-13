import { formatarData, formatarHora } from '@/lib/formatos/datas'
import { formatarBRL } from '@/lib/formatos/moeda'
import { rotuloMotivo } from './devolucao'

/** Indenização da avaria: o valor ajustado pelo engenheiro ou, sem ajuste, o de reposição. */
export function valorIndenizacao(a: { valorReposicao: number; valorIndenizacao: number | null }): {
  centavos: number
  ajustado: boolean
} {
  return a.valorIndenizacao === null
    ? { centavos: a.valorReposicao, ajustado: false }
    : { centavos: a.valorIndenizacao, ajustado: true }
}

export type DadosMensagemAvaria = {
  obra: string
  tipo: string
  codigo: string
  pessoa: string | null
  empresa: string | null
  /** Quando a avaria foi registrada na devolução. */
  quando: string
  motivo: string
  detalhes: string | null
  centavos: number
}

/**
 * Texto que acompanha a foto no compartilhar do celular (WhatsApp etc.): tudo o que o
 * encarregado precisa para conferir e descontar, em linhas curtas.
 */
export function textoMensagemAvaria(d: DadosMensagemAvaria): string {
  const quem = d.pessoa ? `${d.pessoa}${d.empresa ? ` (${d.empresa})` : ''}` : null
  return [
    `*Avaria de ferramenta — ${d.obra}*`,
    `Ferramenta: ${d.tipo} ${d.codigo}`,
    quem && `Devolvida por: ${quem}`,
    `Data: ${formatarData(d.quando)} às ${formatarHora(d.quando)}`,
    `Motivo: ${rotuloMotivo(d.motivo)}`,
    d.detalhes && `Detalhes: ${d.detalhes}`,
    `Valor da indenização: ${formatarBRL(d.centavos)}`,
  ]
    .filter(Boolean)
    .join('\n')
}
