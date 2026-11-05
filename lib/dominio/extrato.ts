/**
 * Extrato de materiais por período (linha do tempo): leitura dos filtros da URL, atalhos de
 * período e agrupamento por dia da obra. Regras puras, sem banco.
 */
import { diaDaObra, formatarData, formatarDiaCurto } from '@/lib/formatos/datas'

export const ATALHOS_PERIODO = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7', rotulo: '7 dias' },
  { valor: '30', rotulo: '30 dias' },
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'livre', rotulo: 'Escolher datas' },
] as const
export type AtalhoPeriodo = (typeof ATALHOS_PERIODO)[number]['valor']

export const TIPOS_FILTRO = [
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'entrada', rotulo: 'Entradas' },
  { valor: 'saida', rotulo: 'Saídas' },
  { valor: 'ajuste', rotulo: 'Ajustes' },
] as const
export type TipoFiltro = (typeof TIPOS_FILTRO)[number]['valor']

export type FiltroExtrato = {
  atalho: AtalhoPeriodo
  /** Dias da obra, `yyyy-MM-dd`, inclusive. */
  de: string
  ate: string
  material: string | null
  tipo: TipoFiltro
}

export const ATALHO_PADRAO: AtalhoPeriodo = '7'

const DIA = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Dia válido no calendário (`2026-02-30` não passa). */
export function diaValido(dia: string): boolean {
  if (!DIA.test(dia)) return false
  const d = new Date(`${dia}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dia
}

/** Soma (ou subtrai) dias a um dia `yyyy-MM-dd`. */
export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** De e até de um atalho, a partir do dia de hoje na obra. */
export function periodoDoAtalho(
  atalho: Exclude<AtalhoPeriodo, 'livre'>,
  hoje: string,
): { de: string; ate: string } {
  if (atalho === 'hoje') return { de: hoje, ate: hoje }
  if (atalho === '7') return { de: somarDias(hoje, -6), ate: hoje }
  if (atalho === '30') return { de: somarDias(hoje, -29), ate: hoje }
  return { de: `${hoje.slice(0, 8)}01`, ate: hoje }
}

type Parametros = Record<string, string | string[] | undefined>
const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * Filtro a partir da URL (`p`, `de`, `ate`, `m`, `t`). Valor estranho volta ao padrão;
 * datas trocadas são desviradas.
 */
export function lerFiltroExtrato(params: Parametros, hoje: string): FiltroExtrato {
  const p = primeiro(params.p)
  const m = primeiro(params.m)
  const t = primeiro(params.t)
  const material = m && UUID.test(m) ? m : null
  const tipo = TIPOS_FILTRO.find((x) => x.valor === t)?.valor ?? 'tudo'

  if (p === 'livre') {
    let de = primeiro(params.de) ?? ''
    let ate = primeiro(params.ate) ?? ''
    if (diaValido(de) || diaValido(ate)) {
      if (!diaValido(de)) de = ate
      if (!diaValido(ate)) ate = de
      if (de > ate) [de, ate] = [ate, de]
      return { atalho: 'livre', de, ate, material, tipo }
    }
  }
  const atalho = ATALHOS_PERIODO.find((x) => x.valor === p && x.valor !== 'livre')?.valor
  const escolhido = (atalho ?? ATALHO_PADRAO) as Exclude<AtalhoPeriodo, 'livre'>
  return { atalho: escolhido, ...periodoDoAtalho(escolhido, hoje), material, tipo }
}

/** Parâmetros da URL de um filtro (o que é padrão fica de fora). */
export function urlDoFiltro(f: FiltroExtrato): string {
  const q = new URLSearchParams()
  if (f.atalho !== ATALHO_PADRAO) q.set('p', f.atalho)
  if (f.atalho === 'livre') {
    q.set('de', f.de)
    q.set('ate', f.ate)
  }
  if (f.material) q.set('m', f.material)
  if (f.tipo !== 'tudo') q.set('t', f.tipo)
  const s = q.toString()
  return s ? `?${s}` : ''
}

type TipoLinha = 'entrada' | 'saida' | 'ajuste' | 'conferencia'

/** "Ajustes" mostra também as conferências (as duas vêm da contagem). */
export function passaNoTipo(tipo: TipoLinha, filtro: TipoFiltro): boolean {
  if (filtro === 'tudo') return true
  if (filtro === 'ajuste') return tipo === 'ajuste' || tipo === 'conferencia'
  return tipo === filtro
}

/** Agrupa por dia da obra, mantendo a ordem (mais recente primeiro). */
export function agruparPorDia<T extends { criadoEm: string }>(
  linhas: T[],
): { dia: string; linhas: T[] }[] {
  const grupos: { dia: string; linhas: T[] }[] = []
  for (const l of linhas) {
    const dia = diaDaObra(l.criadoEm)
    const ultimo = grupos.at(-1)
    if (ultimo?.dia === dia) ultimo.linhas.push(l)
    else grupos.push({ dia, linhas: [l] })
  }
  return grupos
}

/** "Hoje · 05/11/2026", "Ontem · 04/11/2026" ou "seg · 03/11/2026". */
export function rotuloDoDia(dia: string, hoje: string): string {
  const meioDia = `${dia}T12:00:00-03:00`
  const nome =
    dia === hoje
      ? 'Hoje'
      : dia === somarDias(hoje, -1)
        ? 'Ontem'
        : formatarDiaCurto(meioDia).split(' ')[0]
  return `${nome} · ${formatarData(meioDia)}`
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** "2 entradas · 1 saída" (sem apagados/desfeitos); sem entrada nem saída, o total do dia. */
export function resumoDoDia(
  linhas: { tipo: TipoLinha; apagado: boolean; desfeito: boolean }[],
): string {
  const vivas = linhas.filter((l) => !l.apagado && !l.desfeito)
  const entradas = vivas.filter((l) => l.tipo === 'entrada').length
  const saidas = vivas.filter((l) => l.tipo === 'saida').length
  const partes = [
    entradas > 0 ? plural(entradas, 'entrada', 'entradas') : null,
    saidas > 0 ? plural(saidas, 'saída', 'saídas') : null,
  ].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : plural(linhas.length, 'lançamento', 'lançamentos')
}
