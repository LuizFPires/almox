import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_TV, tokenValido } from '@/lib/dados/tv'

/**
 * Conecta a TV: o engenheiro abre `/tv/entrar?t=<token>` uma vez no mini PC. O token vai para
 * um cookie httpOnly (só nas rotas /tv) e sai da URL.
 */
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t')
  const destino = request.nextUrl.clone()
  destino.pathname = '/tv'
  destino.search = ''
  const resposta = NextResponse.redirect(destino, 303)
  // O token não pode vazar para outro site pelo Referer nem ficar em cache.
  resposta.headers.set('Referrer-Policy', 'no-referrer')
  resposta.headers.set('Cache-Control', 'no-store')
  if (tokenValido(token)) {
    resposta.cookies.set(COOKIE_TV, token, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/tv',
      maxAge: 400 * 24 * 60 * 60, // o máximo que os navegadores aceitam
    })
  }
  return resposta
}
