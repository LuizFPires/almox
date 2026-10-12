import { diaDaObra } from '@/lib/formatos/datas'

/** Histórico e auditoria (M10): filtros vindos da URL, validados antes de ir ao servidor. */
export type FiltrosHistorico = {
  de: string
  ate: string
  pessoa: string | null
  empresa: string | null
  tipo: string | null
  via: 'qr' | 'manual' | null
  categoria: 'retirada' | 'devolucao' | 'estorno' | 'ocorrencia' | null
}

export type LinhaHistorico = {
  id: string
  tipo: 'retirada' | 'devolucao' | 'estorno' | 'ocorrencia'
  quando: string
  recebidoEm: string | null
  pessoa: string
  empresa: string
  via: 'qr' | 'manual' | null
  usuario: string
  obs: string | null
  estornoDe: string | null
  itens: { tipo: string; codigo: string; avariada: boolean }[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATA = /^\d{4}-\d{2}-\d{2}$/
const CATEGORIAS = ['retirada', 'devolucao', 'estorno', 'ocorrencia'] as const

type Parametros = Record<string, string | string[] | undefined>

function um(p: Parametros, chave: string): string {
  const v = p[chave]
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
}

function dataValida(texto: string): boolean {
  if (!DATA.test(texto)) return false
  const d = new Date(`${texto}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto
}

/** Filtros da URL; o que vier inválido cai no padrão (últimos 7 dias, tudo). */
export function lerFiltros(p: Parametros, agora: Date): FiltrosHistorico {
  const hoje = diaDaObra(agora)
  const semana = diaDaObra(new Date(agora.getTime() - 6 * 86_400_000))
  let de = dataValida(um(p, 'de')) ? um(p, 'de') : semana
  let ate = dataValida(um(p, 'ate')) ? um(p, 'ate') : hoje
  if (ate < de) [de, ate] = [ate, de]
  const id = (chave: string) => (UUID.test(um(p, chave)) ? um(p, chave) : null)
  const via = um(p, 'via')
  const categoria = um(p, 'categoria')
  return {
    de,
    ate,
    pessoa: id('pessoa'),
    empresa: id('empresa'),
    tipo: id('tipo'),
    via: via === 'qr' || via === 'manual' ? via : null,
    categoria: (CATEGORIAS as readonly string[]).includes(categoria)
      ? (categoria as FiltrosHistorico['categoria'])
      : null,
  }
}

/** Mesmos filtros como query string (link da planilha). */
export function paraQuery(f: FiltrosHistorico): string {
  const q = new URLSearchParams({ de: f.de, ate: f.ate })
  for (const chave of ['pessoa', 'empresa', 'tipo', 'via', 'categoria'] as const) {
    const v = f[chave]
    if (v) q.set(chave, v)
  }
  return q.toString()
}

/** Período tem no máximo um ano (o servidor recusa mais). */
export function periodoValido(f: FiltrosHistorico): boolean {
  const dias = (Date.parse(`${f.ate}T00:00:00Z`) - Date.parse(`${f.de}T00:00:00Z`)) / 86_400_000
  return dias >= 0 && dias <= 366
}

export const ROTULO_CATEGORIA: Record<LinhaHistorico['tipo'], string> = {
  retirada: 'Retirada',
  devolucao: 'Devolução',
  estorno: 'Estorno',
  ocorrencia: 'Não é ele',
}

/** "Pá PA-03, PA-04 · Furadeira FU-01 (avariada)" */
export function resumoItens(itens: LinhaHistorico['itens']): string {
  const porTipo = new Map<string, string[]>()
  for (const i of itens) {
    const codigos = porTipo.get(i.tipo) ?? []
    codigos.push(i.avariada ? `${i.codigo} (avariada)` : i.codigo)
    porTipo.set(i.tipo, codigos)
  }
  return [...porTipo].map(([tipo, codigos]) => `${tipo} ${codigos.join(', ')}`).join(' · ')
}

/** Identificação da linha: QR, manual, ou ocorrência (capacete usado por outra pessoa). */
export function textoVia(l: LinhaHistorico): string {
  if (l.tipo === 'ocorrencia') return 'capacete usado por outra pessoa'
  return l.via === 'qr' ? 'QR do capacete' : 'manual · sem QR'
}
