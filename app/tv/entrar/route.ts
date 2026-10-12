import { NextResponse, type NextRequest } from 'next/server'
import { codigoValido, COOKIE_TV, OPCOES_COOKIE_TV, trocarCodigo } from '@/lib/dados/tv'

/**
 * Conecta a TV: o engenheiro gera em Cadastros › Impressora um código que vale 10 minutos e
 * uma vez, e abre `/tv/entrar?c=<código>` no navegador do mini PC. O servidor troca o código
 * pela credencial da TV (só lê o painel), guarda num cookie httpOnly e tira o código da URL.
 */
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get('c')
  const token = codigoValido(codigo) ? await trocarCodigo(codigo) : null
  const destino = request.nextUrl.clone()
  destino.pathname = '/tv'
  destino.search = token ? '' : '?codigo=invalido'
  const resposta = NextResponse.redirect(destino, 303)
  // O código não pode vazar para outro site pelo Referer nem ficar em cache.
  resposta.headers.set('Referrer-Policy', 'no-referrer')
  resposta.headers.set('Cache-Control', 'no-store')
  if (token) {
    resposta.cookies.set(COOKIE_TV, token, {
      ...OPCOES_COOKIE_TV,
      secure: request.nextUrl.protocol === 'https:',
    })
  }
  return resposta
}
