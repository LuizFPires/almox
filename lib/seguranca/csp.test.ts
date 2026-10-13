import { describe, expect, it } from 'vitest'
import { CSP_APLICADA, montarCspCompleta } from './csp'

describe('CSP', () => {
  it('a parte aplicada barra iframe, plugin, base e formulário para fora', () => {
    expect(CSP_APLICADA).toBe(
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
    )
  })

  it('scripts só do site; conexões só com o Supabase e o Sentry', () => {
    const csp = montarCspCompleta({
      supabaseUrl: 'https://xyz.supabase.co',
      sentryDsn: 'https://chave@o1.ingest.sentry.io/123',
    })
    expect(csp).toContain("script-src 'self' 'unsafe-inline';")
    expect(csp).toContain(
      "connect-src 'self' https://xyz.supabase.co wss://xyz.supabase.co https://o1.ingest.sentry.io;",
    )
    expect(csp).toContain("img-src 'self' data: blob: https://xyz.supabase.co;")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain('report-uri /api/csp')
  })

  it('sem Sentry e em desenvolvimento', () => {
    const csp = montarCspCompleta({
      supabaseUrl: 'http://127.0.0.1:54421',
      desenvolvimento: true,
    })
    expect(csp).toContain("connect-src 'self' http://127.0.0.1:54421 ws://127.0.0.1:54421;")
    expect(csp).toContain("'unsafe-eval'")
    expect(montarCspCompleta({ supabaseUrl: 'lixo' })).toContain("connect-src 'self';")
  })
})
