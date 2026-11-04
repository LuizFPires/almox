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

const ERRO_PADRAO_MATERIAL = 'Não deu certo. Tente de novo.'

/** Texto para o usuario a partir do codigo de erro das RPCs de materiais (AL101 a AL107, 22023). */
export function mensagemErroMaterial(codigo: string | undefined, mensagem?: string): string {
  switch (codigo) {
    case 'AL101':
    case '22023':
      return mensagem?.trim() ? mensagem : ERRO_PADRAO_MATERIAL
    case 'AL102':
      return 'Não dá mais para desfazer. Peça ao engenheiro para corrigir.'
    case 'AL103':
      return 'Este material foi desativado.'
    case 'AL104':
      return 'Já existe um material com esse nome (pode estar desativado).'
    case 'AL105':
      return 'Só dá para desativar com saldo zero.'
    case 'AL106':
      return 'Conferência não se edita.'
    case 'AL107':
      return 'Hora do celular errada. Acerte o relógio e tente de novo.'
    default:
      return ERRO_PADRAO_MATERIAL
  }
}
