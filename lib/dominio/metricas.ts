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

/** Total do período (calculado no banco sobre todas as retiradas medidas). */
export type TotalTempo = {
  tempoMedidas: number
  tempoMedianaS: number | null
  tempoMedioS: number | null
  tempoAte15s: number
}

export type Metricas = { semanas: SemanaMetricas[]; total: TotalTempo }

/**
 * Tempo do QR lido até a retirada registrada (critério do M11: tempo médio até 15 s). A média
 * e a mediana vêm do banco sobre todas as retiradas medidas do período.
 */
export function metaTempo(
  total: TotalTempo,
): Meta & { ate15: number | null; mediana: number | null } {
  if (!total.tempoMedidas || total.tempoMedioS === null) {
    return { valor: null, texto: 'sem medidas', ok: null, ate15: null, mediana: null }
  }
  const valor = total.tempoMedioS
  return {
    valor,
    texto: `${numBR(valor)} s`,
    ok: valor <= 15,
    ate15: pct(total.tempoAte15s, total.tempoMedidas),
    mediana: total.tempoMedianaS,
  }
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

/**
 * Movimentos com pessoa, almoxarife, hora e via (meta: 100%). O banco não aceita movimento sem
 * esses dados: o número confirma a regra, não é medido no campo.
 */
export function metaRastreabilidade(semanas: SemanaMetricas[]): Meta {
  const v = pct(
    semanas.reduce((s, x) => s + x.movimentosCompletos, 0),
    semanas.reduce((s, x) => s + x.movimentos, 0),
  )
  return {
    valor: v,
    texto: v === null ? 'sem movimentos' : `${numBR(v)}% (garantido)`,
    ok: v === null ? null : v === 100,
  }
}

/** Semanas inteiras do período: começam em ou depois de `de` e terminaram antes de `hoje`. */
export function semanasCompletas(semanas: SemanaMetricas[], de: string, hoje: string) {
  const domingo = (segunda: string) => {
    const d = new Date(`${segunda}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 6)
    return d.toISOString().slice(0, 10)
  }
  return semanas.filter((s) => s.semana >= de && domingo(s.semana) < hoje)
}

/**
 * Ferramentas não devolvidas por semana (meta: queda de 50% em 60 dias): compara a média das
 * 2 primeiras semanas inteiras com a das 2 últimas (semana pela metade distorce a conta).
 */
export function metaPerdas(semanas: SemanaMetricas[], de: string, hoje: string): Meta {
  const inteiras = semanasCompletas(semanas, de, hoje)
  if (inteiras.length < 4) return { valor: null, texto: 'precisa de 4 semanas inteiras', ok: null }
  const media = (xs: SemanaMetricas[]) => xs.reduce((s, x) => s + x.pendencias, 0) / xs.length
  const inicio = media(inteiras.slice(0, 2))
  const fim = media(inteiras.slice(-2))
  if (inicio === 0) return { valor: null, texto: 'sem pendências no início', ok: null }
  const queda = Math.round(((inicio - fim) / inicio) * 1000) / 10
  return {
    valor: queda,
    texto: `${queda >= 0 ? 'queda' : 'alta'} de ${numBR(Math.abs(queda))}%`,
    ok: queda >= 50,
  }
}
