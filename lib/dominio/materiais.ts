import type { UnidadeMaterial } from '@/lib/formatos/quantidade'
import { normalizarTexto } from '@/lib/formatos/texto'

export type Aviso = { tipo: 'quantidade' | 'percentual'; valor: number } | null

export type SaldoMaterial = {
  id: string
  nome: string
  unidade: UnidadeMaterial
  saldo: number
  estoqueCheio: number
  aviso: Aviso
}

export type EstadoSaldo = 'abaixo' | 'perto' | 'ok' | 'sem_aviso'

const arredondar = (x: number): number => Math.round(x * 100) / 100

/** Limite do aviso: quantidade fixa ou % do estoque cheio (2 casas). */
export function limiteDoAviso(m: Pick<SaldoMaterial, 'aviso' | 'estoqueCheio'>): number | null {
  if (!m.aviso) return null
  if (m.aviso.tipo === 'quantidade') return m.aviso.valor
  return arredondar((m.estoqueCheio * m.aviso.valor) / 100)
}

/** abaixo: saldo <= limite; perto: <= limite*1.5; ok: acima disso. */
export function estadoSaldo(m: SaldoMaterial): EstadoSaldo {
  const limite = limiteDoAviso(m)
  if (limite === null) return 'sem_aviso'
  if (m.saldo <= limite) return 'abaixo'
  if (m.saldo <= limite * 1.5) return 'perto'
  return 'ok'
}

const PESO: Record<EstadoSaldo, number> = { abaixo: 0, perto: 1, ok: 2, sem_aviso: 2 }

/** Abaixo → perto → resto; alfabético (sem acento) dentro de cada grupo. */
export function ordenarSaldos(lista: SaldoMaterial[]): SaldoMaterial[] {
  return [...lista].sort((a, b) => {
    const p = PESO[estadoSaldo(a)] - PESO[estadoSaldo(b)]
    if (p !== 0) return p
    return normalizarTexto(a.nome).localeCompare(normalizarTexto(b.nome), 'pt-BR')
  })
}

export type ItemContagem = { materialId: string; saldoVisto: number; contado: number }
export type DiferencaContagem = ItemContagem & { diferenca: number }

export function diferencasContagem(itens: ItemContagem[]): {
  menos: DiferencaContagem[]
  mais: DiferencaContagem[]
  bateu: DiferencaContagem[]
} {
  const r = { menos: [] as DiferencaContagem[], mais: [] as DiferencaContagem[], bateu: [] as DiferencaContagem[] }
  for (const i of itens) {
    const diferenca = arredondar(i.contado - i.saldoVisto)
    const d = { ...i, diferenca }
    if (diferenca < 0) r.menos.push(d)
    else if (diferenca > 0) r.mais.push(d)
    else r.bateu.push(d)
  }
  return r
}
