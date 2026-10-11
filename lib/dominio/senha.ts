// Sem letras e números que se confundem ao ditar ou ler (0/O, 1/I/L).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Senha provisória legível para o engenheiro passar à pessoa: 12 caracteres em
 * grupos de 4 (ex.: "K7PQ-M2XD-9RTA"). ~59 bits de entropia; vale até a primeira troca.
 */
export function gerarSenhaProvisoria(aleatorio: (n: number) => Uint8Array = sortear): string {
  // Descarta bytes ≥ 248 (8 × 31) para não favorecer as primeiras letras.
  const limite = Math.floor(256 / ALFABETO.length) * ALFABETO.length
  const chars: string[] = []
  while (chars.length < 12) {
    for (const b of aleatorio(16)) {
      if (b < limite && chars.length < 12) chars.push(ALFABETO[b % ALFABETO.length]!)
    }
  }
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join('')).join('-')
}

function sortear(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

export const TAMANHO_MINIMO_SENHA = 10

/** Nova senha: pelo menos 10 caracteres, igual à confirmação. Devolve o erro ou null. */
export function validarNovaSenha(senha: string, confirmacao: string): string | null {
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
  }
  if (senha !== confirmacao) return 'As duas senhas não são iguais.'
  return null
}
