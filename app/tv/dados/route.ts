import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_TV, lerPainel } from '@/lib/dados/tv'

/** A TV pergunta aqui a cada 2 s (decisão do M8). Só leitura, pelo token do cookie. */
export async function GET(request: NextRequest) {
  const resultado = await lerPainel(request.cookies.get(COOKIE_TV)?.value)
  const semCache = { 'Cache-Control': 'no-store' }
  if (resultado.tipo === 'ok') return NextResponse.json(resultado.painel, { headers: semCache })
  return NextResponse.json(
    { erro: resultado.tipo },
    { status: resultado.tipo === 'nao_autorizado' ? 401 : 503, headers: semCache },
  )
}
