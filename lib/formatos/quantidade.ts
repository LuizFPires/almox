/**
 * Quantidades de material: até 2 casas decimais, de 0,01 a 999.999.
 * Exibição e leitura em formato brasileiro (`1.500`, `2,5`), sem `Intl`.
 */

export const UNIDADES_MATERIAL = ['sc', 'm³', 'kg', 'un', 'm', 'm²', 'l', 'barra', 'rolo', 'lata'] as const
export type UnidadeMaterial = (typeof UNIDADES_MATERIAL)[number]

const UNIDADES_DECIMAIS: readonly UnidadeMaterial[] = ['m³', 'kg', 'm', 'm²', 'l']
const QUANTIDADE_MAXIMA = 999_999

const MILHAR = /\B(?=(\d{3})+(?!\d))/g

/** Número → `1.500`, `2,5`, `1.234.567,25`. Sem zeros sobrando. */
export function formatarQuantidade(n: number): string {
  if (!Number.isFinite(n)) {
    throw new TypeError(`formatarQuantidade espera número finito, recebeu ${n}`)
  }
  const sinal = n < 0 ? '-' : ''
  const [inteira = '0', decimal] = Math.abs(n).toFixed(2).split('.')
  const resto = (decimal ?? '').replace(/0+$/, '')
  return `${sinal}${inteira.replace(MILHAR, '.')}${resto ? `,${resto}` : ''}`
}

const COM_MILHAR = /^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/
const SEM_MILHAR = /^(\d+)(?:,(\d{1,2}))?$/

/**
 * Texto digitado → número. Aceita `1.500`, `1500`, `2,5`, `1.234,75`.
 * Devolve `null` para texto inválido, negativo ou com mais de 2 casas.
 */
export function lerQuantidade(texto: string): number | null {
  const limpo = texto.trim()
  const partes = COM_MILHAR.exec(limpo) ?? SEM_MILHAR.exec(limpo)
  if (!partes) return null
  const inteira = (partes[1] ?? '').replaceAll('.', '')
  const n = Number(`${inteira}.${partes[2] ?? '0'}`)
  return Number.isFinite(n) ? n : null
}

export function unidadeAceitaDecimal(u: UnidadeMaterial): boolean {
  return UNIDADES_DECIMAIS.includes(u)
}

/** Maior que 0, no máximo 999.999, inteira ou com até 2 casas conforme a unidade. */
export function quantidadeValida(n: number, u: UnidadeMaterial): boolean {
  if (!Number.isFinite(n) || n <= 0 || n > QUANTIDADE_MAXIMA) return false
  const casas = unidadeAceitaDecimal(u) ? 100 : 1
  return Math.abs(n * casas - Math.round(n * casas)) < 1e-9
}
