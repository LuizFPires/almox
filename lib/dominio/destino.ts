const BASE = 'http://interno.invalid'

/**
 * Destino depois do login. Só aceita caminhos internos do app, para o parâmetro
 * `volta` não virar um redirecionamento para outro site. Recusa caracteres de
 * controle (o navegador remove tab e quebra de linha: "/\t/x" viraria "//x") e
 * devolve o caminho normalizado pelo URL, nunca o texto recebido.
 */
export function destinoSeguro(volta: string | null | undefined): string {
  if (
    !volta ||
    /[\u0000-\u001F\u007F\\]/.test(volta) ||
    !volta.startsWith('/') ||
    volta.startsWith('//')
  ) {
    return '/inicio'
  }
  let url: URL
  try {
    url = new URL(volta, BASE)
  } catch {
    return '/inicio'
  }
  if (url.origin !== BASE) return '/inicio'
  const caminho = url.pathname + url.search + url.hash
  if (caminho === '/' || caminho.startsWith('/login') || caminho.startsWith('/auth')) {
    return '/inicio'
  }
  return caminho
}
