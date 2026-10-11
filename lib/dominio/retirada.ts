import { compararCodigos } from './cadastros'

export type TipoParaRetirar = {
  id: string
  nome: string
  icone: string
  altoValor: boolean
  /** Códigos das unidades livres (qualquer ordem). */
  livres: string[]
}

/** "5 livres", "1 livre", "de 5 livres" (já escolhendo) ou "nenhuma livre". */
export function textoDisponivel(livres: number, escolhidas: number): string {
  if (livres === 0) return 'nenhuma livre'
  const base = livres === 1 ? '1 livre' : `${livres} livres`
  return escolhidas > 0 ? `de ${base}` : base
}

/** Toque no ícone soma 1, até o número de livres (RN-07). */
export function somarUm(atual: number, livres: number): number {
  return atual < livres ? atual + 1 : atual
}

/**
 * Prévia das unidades que vão sair: as livres de menor código (RN-08). O servidor aloca
 * de novo na hora de gravar (pode mudar se outro celular pegou alguma antes).
 */
export function previaCodigos(livres: string[], quantidade: number): string[] {
  return [...livres].sort(compararCodigos).slice(0, quantidade)
}

export type Escolha = { tipo: TipoParaRetirar; quantidade: number }

/** "Furadeira ×2, Pá ×1" (na ordem da grade). */
export function resumoEscolhas(escolhas: Escolha[]): string {
  const marcadas = escolhas.filter((e) => e.quantidade > 0)
  if (marcadas.length === 0) return 'nenhum'
  return marcadas.map((e) => `${e.tipo.nome} ×${e.quantidade}`).join(', ')
}

/** "Continuar (3 itens)" / "Continuar (1 item)" / "Selecione as ferramentas". */
export function textoContinuar(total: number): string {
  if (total === 0) return 'Selecione as ferramentas'
  return `Continuar (${total} ${total === 1 ? 'item' : 'itens'})`
}

/** Texto da confirmação obrigatória (RN-11), com aviso de alto valor (RN-10). */
export function textoConfirmacao(primeiro: string, temAltoValor: boolean): string {
  return `${temAltoValor ? 'Inclui ferramenta de alto valor. ' : ''}Conferi pessoalmente: é o ${primeiro} que está pegando.`
}

/** Aviso de retirada sem QR (depois de "Lançamento sem QR."), conforme RN-05/RN-06. */
export const AVISO_SEM_QR =
  'Fica marcado como manual no histórico. O que sair sem QR pode voltar sem QR.'
