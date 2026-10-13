/** Junta lançamentos que chegam em rajada num recarregamento só. */
export const AGRUPAR_MS = 400
/** Com lançamentos sem parar, a tela atualiza pelo menos a cada 3 s (não fica congelada). */
export const PRAZO_MAXIMO_MS = 3000

/**
 * Quanto esperar para atualizar depois de um evento: 400 ms para juntar a rajada, mas nunca
 * passando de 3 s desde o primeiro evento ainda não mostrado.
 */
export function esperaAtualizacao(agora: number, primeiroEvento: number): number {
  return Math.max(0, Math.min(AGRUPAR_MS, primeiroEvento + PRAZO_MAXIMO_MS - agora))
}
