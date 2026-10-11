/**
 * Destino depois do login. Só aceita caminhos internos do app, para o parâmetro
 * `volta` não virar um redirecionamento para outro site.
 */
export function destinoSeguro(volta: string | null | undefined): string {
  if (!volta || !volta.startsWith('/') || volta.startsWith('//') || volta.includes('\\')) {
    return '/inicio'
  }
  if (volta === '/' || volta.startsWith('/login') || volta.startsWith('/auth')) return '/inicio'
  return volta
}
