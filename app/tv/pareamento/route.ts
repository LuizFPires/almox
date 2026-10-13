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
  }
  const segredo = randomBytes(32).toString('hex')
  const codigo = await pedirPareamento(segredo)
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
  const resposta = NextResponse.json({ estado: 'aprovado' })
  resposta.cookies.set(COOKIE_TV, pedido.token, { ...OPCOES_COOKIE_TV, secure: seguro(request) })
  resposta.cookies.delete({ name: COOKIE_PEDIDO_TV, path: '/tv' })
  return semCache(resposta)
}
