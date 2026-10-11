import { formatarDataHora } from '@/lib/formatos/datas'
import { compararCodigos } from './cadastros'

/** Motivos de avaria (RN-09), na ordem do protótipo. */
export const MOTIVOS = [
  { valor: 'quebrada', rotulo: 'Quebrada' },
  { valor: 'cabo_rompido', rotulo: 'Cabo rompido' },
  { valor: 'nao_liga', rotulo: 'Não liga' },
  { valor: 'desgaste', rotulo: 'Desgaste' },
  { valor: 'peca_faltando', rotulo: 'Peça faltando' },
] as const

export type Motivo = (typeof MOTIVOS)[number]['valor']

export function rotuloMotivo(motivo: string): string {
  return MOTIVOS.find((m) => m.valor === motivo)?.rotulo ?? motivo
}

export type ItemComEla = {
  tipoId: string
  tipo: string
  icone: string
  codigo: string
  desde: string
  via: 'qr' | 'manual'
}

export type GrupoDevolucao = {
  tipoId: string
  tipo: string
  icone: string
  /** Códigos na ordem em que voltam: os mais antigos primeiro (RN-08). */
  codigos: string[]
}

/**
 * O que pode voltar, agrupado por tipo. Com o capacete conferido, tudo; sem ele, só o que
 * saiu sem QR (RN-02/RN-06).
 */
export function agruparParaDevolver(itens: ItemComEla[], comQr: boolean): GrupoDevolucao[] {
  const grupos = new Map<string, GrupoDevolucao & { itens: ItemComEla[] }>()
  for (const item of itens) {
    if (!comQr && item.via !== 'manual') continue
    const g = grupos.get(item.tipoId) ?? {
      tipoId: item.tipoId,
      tipo: item.tipo,
      icone: item.icone,
      codigos: [],
      itens: [],
    }
    g.itens.push(item)
    grupos.set(item.tipoId, g)
  }
  return [...grupos.values()].map(({ itens: lista, ...g }) => ({
    ...g,
    codigos: lista
      .sort((a, b) => a.desde.localeCompare(b.desde) || compararCodigos(a.codigo, b.codigo))
      .map((i) => i.codigo),
  }))
}

/** Avariadas nunca passam das que estão voltando. */
export function limitarAvariadas(avariadas: number, devolvendo: number): number {
  return Math.max(0, Math.min(avariadas, devolvendo))
}

/** Rodapé: "Pá ×1, Martelete ×1" do que fica com a pessoa, ou "nada". */
export function textoFicaComEle(
  grupos: GrupoDevolucao[],
  devolvendo: Record<string, number>,
  totaisComEla: Record<string, number>,
): string {
  const ficam = grupos
    .map((g) => ({
      g,
      n: (totaisComEla[g.tipoId] ?? g.codigos.length) - (devolvendo[g.tipoId] ?? 0),
    }))
    .filter((x) => x.n > 0)
  return ficam.length === 0 ? 'nada' : ficam.map((x) => `${x.g.tipo} ×${x.n}`).join(', ')
}

/** Texto do botão, na prioridade do protótipo. */
export function textoRegistrar(total: number, faltaFoto: boolean): string {
  if (faltaFoto) return 'Falta a foto da avaria'
  if (total === 0) return 'Informe quantas voltaram'
  return `Registrar devolução (${total} ${total === 1 ? 'item' : 'itens'})`
}

/** Linha da tela de sucesso. */
export function statusDevolvido(quantidade: number, avariadas: number): string {
  if (avariadas === 0) return 'de volta ao almoxarifado'
  if (avariadas === quantidade) {
    return quantidade === 1 ? 'avariada · foi para manutenção' : 'avariadas · foram para manutenção'
  }
  return `${quantidade - avariadas} em ordem · ${avariadas} para manutenção`
}

/** Carimbo gravado na foto da avaria: "Pá · 11/10/2026 14:32 · Ana (almoxarife)". */
export function textoCarimbo(tipo: string, quando: Date, autor: string): string {
  return `${tipo} · ${formatarDataHora(quando)} · ${autor}`
}
