const BASE = 'http://interno.invalid'
// Caracteres de controle e barra invertida: o navegador apaga tab/quebra de linha
// ("/\t/x" viraria "//x") e trata "\" como "/".
const PROIBIDOS = /[\u0000-\u001F\u007F\\]/

function caminhoInterno(caminho: string): boolean {
  return caminho.startsWith('/') && !caminho.startsWith('//') && !PROIBIDOS.test(caminho)
}

/**
 * Destino depois do login. Só aceita caminhos internos do app, para o parâmetro
 * `volta` não virar um redirecionamento para outro site. Valida o texto recebido e
 * de novo o caminho normalizado pelo URL ("/.//site" vira "//site"), e devolve
 * o caminho normalizado, nunca o texto recebido.
 */
export function destinoSeguro(volta: string | null | undefined): string {
  if (!volta || !caminhoInterno(volta)) return '/'
  let url: URL
  try {
    url = new URL(volta, BASE)
  } catch {
    return '/'
  }
  if (url.origin !== BASE) return '/'
  const caminho = url.pathname + url.search + url.hash
  if (
    !caminhoInterno(caminho) ||
    caminho === '/' ||
    caminho.startsWith('/login') ||
    caminho.startsWith('/auth')
  ) {
    return '/'
  }
  return caminho
}

/** Cookie com o último modo usado (gravado pela chave Ferramentas | Materiais). */
export const COOKIE_MODO = 'almox_modo'

/**
 * Início do modo em que a pessoa estava. As Server Actions mandam para cá, e não para `/`: o
 * redirecionamento da raiz (next.config) não vale na navegação feita depois de uma ação, e a
 * tela ficaria com o endereço `/`.
 */
export function inicioDoModo(modo: string | null | undefined): '/inicio' | '/materiais' {
  return modo === 'materiais' ? '/materiais' : '/inicio'
}
