/**
 * Monitoramento de erros (Sentry, M10) sem dado pessoal: antes de sair do app, o evento perde
 * usuário, cookies, cabeçalhos, corpo e query string (código da TV, filtros), e textos têm
 * e-mails e tokens (hex longo, JWT) mascarados.
 */

type Registro = Record<string, unknown>

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const HEX_LONGO = /\b[0-9a-f]{16,}\b/gi
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g

/** Mascara e-mail, token do capacete/TV (hex) e JWT num texto. */
export function mascarar(texto: string): string {
  return texto.replace(JWT, '[jwt]').replace(EMAIL, '[e-mail]').replace(HEX_LONGO, '[token]')
}

/** Endereço sem query string nem fragmento (o caminho fica; ids são uuids, não dados pessoais). */
export function semQuery(url: string): string {
  return mascarar(url.split(/[?#]/)[0] ?? '')
}

function ehRegistro(v: unknown): v is Registro {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Limpa o evento do Sentry no lugar e devolve o mesmo objeto. */
export function limparEvento<T>(evento: T): T {
  if (!ehRegistro(evento)) return evento
  const e: Registro = evento
  delete e.user
  delete e.server_name
  delete e.extra
  if (ehRegistro(e.request)) {
    const r = e.request
    delete r.cookies
    delete r.headers
    delete r.data
    delete r.query_string
    delete r.env
    if (typeof r.url === 'string') r.url = semQuery(r.url)
  }
  if (typeof e.message === 'string') e.message = mascarar(e.message)
  const excecao = e.exception
  if (ehRegistro(excecao) && Array.isArray(excecao.values)) {
    for (const v of excecao.values) {
      if (ehRegistro(v) && typeof v.value === 'string') v.value = mascarar(v.value)
    }
  }
  if (Array.isArray(e.breadcrumbs)) {
    // Migalhas do console levam os argumentos crus (podem ter qualquer dado): saem.
    e.breadcrumbs = e.breadcrumbs.filter((b) => !(ehRegistro(b) && b.category === 'console'))
    for (const b of e.breadcrumbs as unknown[]) {
      if (!ehRegistro(b)) continue
      if (ehRegistro(b.data)) delete b.data.arguments
      if (typeof b.message === 'string') b.message = mascarar(b.message)
      if (ehRegistro(b.data)) {
        for (const chave of ['url', 'from', 'to']) {
          if (typeof b.data[chave] === 'string') b.data[chave] = semQuery(b.data[chave] as string)
        }
      }
    }
  }
  return evento
}
