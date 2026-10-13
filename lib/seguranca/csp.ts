/**
 * Content-Security-Policy do app (auditoria de 13/10/2026, APP-01). Duas partes:
 * - `CSP_APLICADA`: o que não depende de script e já vale (sem iframe, sem plugin, sem
 *   `<base>` nem formulário para fora).
 * - `montarCspCompleta`: scripts, conexões, imagens e fontes só do próprio site, do Supabase
 *   e do Sentry. Vai em Report-Only até os relatórios mostrarem que nada legítimo é barrado.
 *
 * Sem nonce: com o pré-render parcial (cacheComponents) a casca estática da página sai antes
 * da requisição, e só 6 de 18 scripts recebiam o nonce (conferido em 13/10/2026). O script
 * inline do Next (dados do RSC) obriga o 'unsafe-inline'; o React já escapa o que mostra.
 */
export const CSP_APLICADA = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export const CAMINHO_RELATORIO_CSP = '/api/csp'

type Fontes = { supabaseUrl?: string; sentryDsn?: string; desenvolvimento?: boolean }

/** Origem (`https://host`) de uma URL, ou null se não for válida. */
function origem(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export function montarCspCompleta(fontes: Fontes): string {
  const supabase = origem(fontes.supabaseUrl)
  const supabaseWs = supabase?.replace(/^http/, 'ws')
  const sentry = origem(fontes.sentryDsn)
  const conexoes = ["'self'", supabase, supabaseWs, sentry].filter(Boolean)
  // Em desenvolvimento o Next usa eval (React Refresh).
  const scripts = ["'self'", "'unsafe-inline'", fontes.desenvolvimento && "'unsafe-eval'"].filter(
    Boolean,
  )
  return [
    "default-src 'self'",
    `script-src ${scripts.join(' ')}`,
    // Tailwind e atributos style do React.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${supabase ? ` ${supabase}` : ''}`,
    "font-src 'self' data:",
    `connect-src ${conexoes.join(' ')}`,
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    CSP_APLICADA,
    `report-uri ${CAMINHO_RELATORIO_CSP}`,
  ].join('; ')
}
