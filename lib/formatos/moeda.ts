/**
 * Dinheiro no Almox é sempre inteiro em centavos (CLAUDE.md › Convenções).
 * Estas são as únicas funções que convertem entre centavos e texto em reais.
 */

const MILHAR = /\B(?=(\d{3})+(?!\d))/g

/** Centavos → `R$ 1.234,56`. Recusa valor que não seja inteiro. */
export function formatarBRL(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new TypeError(`formatarBRL espera inteiro em centavos, recebeu ${centavos}`)
  }
  const sinal = centavos < 0 ? '-' : ''
  const absoluto = Math.abs(centavos)
  const reais = String(Math.trunc(absoluto / 100)).replace(MILHAR, '.')
  const resto = String(absoluto % 100).padStart(2, '0')
  return `${sinal}R$ ${reais},${resto}`
}

const COM_MILHAR = /^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/
const SEM_MILHAR = /^(\d+)(?:,(\d{1,2}))?$/

/**
 * Texto digitado em reais → centavos. Aceita `2.890,00`, `2890,00`, `2890`, `R$ 2.890,00`.
 * Devolve `null` quando o texto não é um valor brasileiro válido e não negativo.
 */
export function lerBRL(texto: string): number | null {
  const limpo = texto.replace(/^\s*R\$\s*/i, '').trim()
  const partes = COM_MILHAR.exec(limpo) ?? SEM_MILHAR.exec(limpo)
  if (!partes) return null
  const reais = (partes[1] ?? '').replaceAll('.', '')
  const decimais = (partes[2] ?? '').padEnd(2, '0')
  const centavos = Number(reais) * 100 + Number(decimais)
  return Number.isSafeInteger(centavos) ? centavos : null
}
