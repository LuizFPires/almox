import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_TV, lerPainel, OPCOES_COOKIE_TV } from '@/lib/dados/tv'

/**
 * A TV pergunta aqui a cada 2 s (decisão do M8), mandando a versão que já tem (`?v=`).
 * Só leitura, pela credencial do cookie. Respostas: 200 com o painel; 200 `{agora}` quando
 * nada mudou; 401 só se a credencial não vale mais; 503 em qualquer outra falha.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_TV)?.value
  const resultado = await lerPainel(token, request.nextUrl.searchParams.get('v'))
  const semCache = { 'Cache-Control': 'no-store' }
  if (resultado.tipo === 'nao_autorizado' || resultado.tipo === 'erro') {
    return NextResponse.json(
      { erro: resultado.tipo },
      { status: resultado.tipo === 'nao_autorizado' ? 401 : 503, headers: semCache },
    )
  }
  const resposta = NextResponse.json(
    resultado.tipo === 'ok' ? resultado.painel : { agora: resultado.agora },
    { headers: semCache },
  )
  // Renova o cookie: a TV ligada não perde a credencial.
  if (token) {
    resposta.cookies.set(COOKIE_TV, token, {
      ...OPCOES_COOKIE_TV,
      secure: request.nextUrl.protocol === 'https:',
    })
  }
  return resposta
}
