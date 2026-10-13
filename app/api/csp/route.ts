import { NextResponse, type NextRequest } from 'next/server'

const TAMANHO_MAXIMO = 8_000

/** Só a origem do recurso barrado: o caminho e a query podem trazer dado pessoal. */
function origemDe(valor: unknown): string {
  if (typeof valor !== 'string') return '?'
  if (!valor.includes(':')) return valor.slice(0, 40)
  try {
    return new URL(valor).origin
  } catch {
    return valor.split(':')[0]?.slice(0, 20) ?? '?'
  }
}

/**
 * Relatórios da CSP em Report-Only (navegador manda sozinho). Registra só a diretiva e a
 * origem do que seria barrado, para decidir quando aplicar a política (onda 2).
 */
export async function POST(request: NextRequest) {
  const texto = (await request.text()).slice(0, TAMANHO_MAXIMO)
  try {
    const corpo = JSON.parse(texto) as unknown
    const lista = Array.isArray(corpo) ? corpo : [corpo]
    for (const item of lista.slice(0, 10)) {
      const r = item as Record<string, Record<string, unknown> | undefined>
      const dados = r['csp-report'] ?? r.body ?? {}
      const diretiva = dados['violated-directive'] ?? dados.effectiveDirective ?? '?'
      const bloqueado = dados['blocked-uri'] ?? dados.blockedURL
      console.warn('CSP (report-only):', String(diretiva).slice(0, 40), origemDe(bloqueado))
    }
  } catch {
    // Corpo inválido: ignora.
  }
  return new NextResponse(null, { status: 204 })
}
