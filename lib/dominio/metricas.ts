/** Métricas do piloto (PRD §3), por semana, e o resumo do período com as metas. */
export type SemanaMetricas = {
  semana: string
  retiradas: number
  semQr: number
  tempoMedianaS: number | null
  tempoMedioS: number | null
  tempoAte15s: number
  tempoMedidas: number
  pendencias: number
  pendenciasComAviso: number
  movimentos: number
  movimentosCompletos: number
}

export type Meta = { valor: number | null; texto: string; ok: boolean | null }

const pct = (parte: number, todo: number) =>
  todo > 0 ? Math.round((parte / todo) * 1000) / 10 : null
const numBR = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

/** % de retiradas sem QR (meta: menos de 10%). */
export function metaSemQr(semanas: SemanaMetricas[]): Meta {
  const r = semanas.reduce((s, x) => s + x.retiradas, 0)
  const v = pct(
    semanas.reduce((s, x) => s + x.semQr, 0),
    r,
  )
  return {
    valor: v,
    texto: v === null ? 'sem retiradas' : `${numBR(v)}%`,
    ok: v === null ? null : v < 10,
  }
}

/**
 * Tempo do QR lido até a retirada registrada (meta: até 15 s): mediana ponderada pelas medidas
 * de cada semana (aproximação) e % das retiradas medidas dentro dos 15 s.
 */
export function metaTempo(semanas: SemanaMetricas[]): Meta & { ate15: number | null } {
  const medidas = semanas.reduce((s, x) => s + x.tempoMedidas, 0)
  if (medidas === 0) return { valor: null, texto: 'sem medidas', ok: null, ate15: null }
  const soma = semanas.reduce((s, x) => s + (x.tempoMedianaS ?? 0) * x.tempoMedidas, 0)
  const valor = Math.round((soma / medidas) * 10) / 10
  const ate15 = pct(
    semanas.reduce((s, x) => s + x.tempoAte15s, 0),
    medidas,
  )
  return { valor, texto: `${numBR(valor)} s`, ok: valor <= 15, ate15 }
}

/** Pendências de empreiteira com aviso enviado (meta: 100%). */
export function metaAvisos(semanas: SemanaMetricas[]): Meta {
  const v = pct(
    semanas.reduce((s, x) => s + x.pendenciasComAviso, 0),
    semanas.reduce((s, x) => s + x.pendencias, 0),
  )
  return {
    valor: v,
    texto: v === null ? 'sem pendências' : `${numBR(v)}%`,
    ok: v === null ? null : v === 100,
  }
}

/** Movimentos com pessoa, almoxarife, hora e via (meta: 100%). */
export function metaRastreabilidade(semanas: SemanaMetricas[]): Meta {
  const v = pct(
    semanas.reduce((s, x) => s + x.movimentosCompletos, 0),
    semanas.reduce((s, x) => s + x.movimentos, 0),
  )
  return {
    valor: v,
    texto: v === null ? 'sem movimentos' : `${numBR(v)}%`,
    ok: v === null ? null : v === 100,
  }
}

/**
 * Ferramentas não devolvidas por semana (meta: queda de 50% em 60 dias): compara a média das
 * 2 primeiras semanas com a das 2 últimas.
 */
export function metaPerdas(semanas: SemanaMetricas[]): Meta {
  if (semanas.length < 4) return { valor: null, texto: 'precisa de 4 semanas', ok: null }
  const media = (xs: SemanaMetricas[]) => xs.reduce((s, x) => s + x.pendencias, 0) / xs.length
  const inicio = media(semanas.slice(0, 2))
  const fim = media(semanas.slice(-2))
  if (inicio === 0) return { valor: null, texto: 'sem pendências no início', ok: null }
  const queda = Math.round(((inicio - fim) / inicio) * 1000) / 10
  return {
    valor: queda,
    texto: `${queda >= 0 ? 'queda' : 'alta'} de ${numBR(Math.abs(queda))}%`,
    ok: queda >= 50,
  }
}
