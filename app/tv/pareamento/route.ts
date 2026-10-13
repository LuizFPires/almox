import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import {
  consultarPareamento,
  COOKIE_PEDIDO_TV,
  COOKIE_TV,
  OPCOES_COOKIE_PEDIDO,
  OPCOES_COOKIE_TV,
  pedirPareamento,
  segredoValido,
} from '@/lib/dados/tv'

function semCache(resposta: NextResponse) {
  resposta.headers.set('Cache-Control', 'no-store')
  return resposta
}

const seguro = (request: NextRequest) => request.nextUrl.protocol === 'https:'

/**
 * IP de quem pediu (a Vercel preenche estes cabeçalhos). O próprio servidor (127.0.0.1, ::1:
 * computador de teste e CI) não entra no limite por IP.
 */
function ipDe(request: NextRequest): string | null {
  const ip = (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0] ??
    ''
  ).trim()
  if (!ip || /^(127\.|::1$|::ffff:127\.)/.test(ip)) return null
  return ip.slice(0, 64)
}

/**
 * A TV sem credencial pede um código para mostrar (POST). Se já tem um pedido vivo, devolve o
 * mesmo código (recarregar a página não troca o número que alguém está digitando).
 */
export async function POST(request: NextRequest) {
  const atual = request.cookies.get(COOKIE_PEDIDO_TV)?.value
  if (segredoValido(atual)) {
    const pedido = await consultarPareamento(atual)
    if (pedido.estado === 'esperando') {
      return semCache(NextResponse.json({ codigo: pedido.codigo }))
    }
    // Aprovado entre duas perguntas (a TV recarregou): a credencial já saiu, então fica aqui.
    if (pedido.estado === 'aprovado') return entrar(request, pedido.token)
  }
  const segredo = randomBytes(32).toString('hex')
  const codigo = await pedirPareamento(segredo, ipDe(request))
  if (!codigo) return semCache(NextResponse.json({ erro: true }, { status: 503 }))
  const resposta = NextResponse.json({ codigo })
  resposta.cookies.set(COOKIE_PEDIDO_TV, segredo, {
    ...OPCOES_COOKIE_PEDIDO,
    secure: seguro(request),
  })
  return semCache(resposta)
}

/**
 * A TV pergunta se o código foi aprovado (GET, a cada 2 s). Aprovado: guarda a credencial no
 * cookie do painel e apaga o pedido; a tela recarrega e o painel aparece.
 */
export async function GET(request: NextRequest) {
  const segredo = request.cookies.get(COOKIE_PEDIDO_TV)?.value
  if (!segredoValido(segredo)) return semCache(NextResponse.json({ estado: 'vencido' }))
  const pedido = await consultarPareamento(segredo)
  if (pedido.estado === 'erro') {
    return semCache(NextResponse.json({ estado: 'erro' }, { status: 503 }))
  }
  if (pedido.estado !== 'aprovado') return semCache(NextResponse.json(pedido))
  return entrar(request, pedido.token)
}

/** Guarda a credencial do painel no cookie da TV e apaga o pedido; a tela recarrega. */
function entrar(request: NextRequest, token: string) {
  const resposta = NextResponse.json({ estado: 'aprovado' })
  resposta.cookies.set(COOKIE_TV, token, { ...OPCOES_COOKIE_TV, secure: seguro(request) })
  resposta.cookies.delete({ name: COOKIE_PEDIDO_TV, path: '/tv' })
  return semCache(resposta)
}
