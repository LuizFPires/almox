import {
  formatarQuantidade,
  lerQuantidade,
  quantidadeValida,
  type UnidadeMaterial,
} from '@/lib/formatos/quantidade'
import { contemTexto, normalizarTexto } from '@/lib/formatos/texto'

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

/** Resumo do aviso nas listas de cadastro: "aviso em 20 un", "aviso em 15%" ou "sem aviso". */
export function textoAviso(m: Pick<SaldoMaterial, 'aviso' | 'unidade'>): string {
  if (!m.aviso) return 'sem aviso'
  const valor = formatarQuantidade(m.aviso.valor)
  return m.aviso.tipo === 'percentual' ? `aviso em ${valor}%` : `aviso em ${valor} ${m.unidade}`
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

export type TipoLancamento = 'entrada' | 'saida'

export type PreviaLancamento = {
  /** Saldo depois do lançamento. */
  depois: number
  /** Saída maior que o saldo: não pode registrar. */
  excede: boolean
  /** Saída que leva o saldo de acima do limite para ele ou abaixo (dispara o aviso). */
  cruzaLimite: boolean
  limite: number | null
}

/** O que a entrada ou saída de `quantidade` faz com o saldo do material. */
export function previaLancamento(
  tipo: TipoLancamento,
  m: SaldoMaterial,
  quantidade: number,
): PreviaLancamento {
  const depois = arredondar(tipo === 'entrada' ? m.saldo + quantidade : m.saldo - quantidade)
  const limite = limiteDoAviso(m)
  const excede = tipo === 'saida' && quantidade > m.saldo
  const cruzaLimite =
    tipo === 'saida' && !excede && quantidade > 0 && limite !== null && m.saldo > limite && depois <= limite
  return { depois, excede, cruzaLimite, limite }
}

const porNome = (a: SaldoMaterial, b: SaldoMaterial): number =>
  normalizarTexto(a.nome).localeCompare(normalizarTexto(b.nome), 'pt-BR')

/**
 * Lista para escolher o material. Entrada: alfabética. Saída: com saldo primeiro, depois os
 * mais usados (`ordemMaisUsados`, ids fora da lista são ignorados), depois alfabética.
 */
export function ordenarParaLancamento(
  tipo: TipoLancamento,
  lista: SaldoMaterial[],
  ordemMaisUsados: string[],
): SaldoMaterial[] {
  if (tipo === 'entrada') return [...lista].sort(porNome)
  const posicao = new Map(ordemMaisUsados.map((id, i) => [id, i]))
  const rank = (m: SaldoMaterial) => posicao.get(m.id) ?? Number.POSITIVE_INFINITY
  return [...lista].sort((a, b) => {
    const comSaldo = Number(b.saldo > 0) - Number(a.saldo > 0)
    if (comSaldo !== 0) return comSaldo
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra < rb ? -1 : 1
    return porNome(a, b)
  })
}

/** Busca por nome, sem acento e sem maiúsculas dos dois lados. */
export function filtrarMateriais(lista: SaldoMaterial[], busca: string): SaldoMaterial[] {
  return lista.filter((m) => contemTexto(m.nome, busca))
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

/** Rascunho da contagem: o que foi digitado e o saldo que a pessoa via ao digitar. */
export type RascunhoContagem = Record<string, { valor: string; saldoVisto: number }>

/** Chave do `localStorage` do rascunho: uma por obra e por dia da obra (`yyyy-MM-dd`). */
export function chaveRascunhoContagem(obraId: string, dia: string): string {
  return `almox:contagem:${obraId}:${dia}`
}

/** Itens da contagem a partir do rascunho. Ignora vazio, inválido e material que sumiu. Zero vale (acabou). */
export function itensDoRascunho(rascunho: RascunhoContagem, saldos: SaldoMaterial[]): ItemContagem[] {
  const itens: ItemContagem[] = []
  for (const m of saldos) {
    const campo = rascunho[m.id]
    if (!campo || campo.valor.trim() === '') continue
    const contado = lerQuantidade(campo.valor)
    if (contado === null) continue
    if (contado !== 0 && !quantidadeValida(contado, m.unidade)) continue
    itens.push({ materialId: m.id, saldoVisto: campo.saldoVisto, contado })
  }
  return itens
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
