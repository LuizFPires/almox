import { NextResponse, type NextRequest } from 'next/server'

const TAMANHO_MAXIMO = 8_000
const TIPOS = ['application/csp-report', 'application/reports+json', 'application/json']

/** Sem quebra de linha nem caractere de controle: ninguém forja linha no log. */
function limpo(valor: unknown, tamanho: number): string {
  return String(valor ?? '?')
    .replace(/[^\x20-\x7e]/g, '')
    .slice(0, tamanho)
}

/** Só a origem do recurso barrado: o caminho e a query podem trazer dado pessoal. */
function origemDe(valor: unknown): string {
  if (typeof valor !== 'string') return '?'
  if (!valor.includes(':')) return limpo(valor, 40)
  try {
    return limpo(new URL(valor).origin, 80)
  } catch {
    return limpo(valor.split(':')[0], 20)
  }
}

/**
 * Relatórios da CSP em Report-Only (o navegador manda sozinho, sem sessão). Registra uma linha
 * por pedido, só com a diretiva e a origem do que seria barrado, para decidir quando aplicar a
 * política (onda 2). Corpo grande ou de outro tipo é ignorado antes de ler.
 */
export async function POST(request: NextRequest) {
  const tipo = (request.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? ''
  const tamanho = Number(request.headers.get('content-length') ?? TAMANHO_MAXIMO + 1)
  if (!TIPOS.includes(tipo) || !(tamanho <= TAMANHO_MAXIMO)) {
    return new NextResponse(null, { status: 204 })
  }
  try {
    const corpo = JSON.parse((await request.text()).slice(0, TAMANHO_MAXIMO)) as unknown
    const item = (Array.isArray(corpo) ? corpo[0] : corpo) as
      Record<string, Record<string, unknown> | undefined> | undefined
    const dados = item?.['csp-report'] ?? item?.body ?? {}
    const diretiva = dados['violated-directive'] ?? dados.effectiveDirective
    const bloqueado = dados['blocked-uri'] ?? dados.blockedURL
    console.warn('CSP (report-only):', limpo(diretiva, 40), origemDe(bloqueado))
  } catch {
    // Corpo inválido: ignora.
  }
  return new NextResponse(null, { status: 204 })
}
