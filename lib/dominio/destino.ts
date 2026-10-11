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
  if (!volta || !caminhoInterno(volta)) return '/inicio'
  let url: URL
  try {
    url = new URL(volta, BASE)
  } catch {
    return '/inicio'
  }
  if (url.origin !== BASE) return '/inicio'
  const caminho = url.pathname + url.search + url.hash
  if (
    !caminhoInterno(caminho) ||
    caminho === '/' ||
    caminho.startsWith('/login') ||
    caminho.startsWith('/auth')
  ) {
    return '/inicio'
  }
  return caminho
}
