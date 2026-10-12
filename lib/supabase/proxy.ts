import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { lerAmbientePublico } from './ambiente'
import type { Database } from './tipos-banco'

/**
 * Rotas abertas: login, retorno do link mágico, a TV (credencial própria, M8) e o processador
 * de envios (chamado pelo agendamento do Supabase com segredo, M9).
 */
const ROTAS_PUBLICAS = ['/login', '/auth', '/tv', '/api/envios']

export function ehRotaPublica(caminho: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`))
}

/**
 * Renova a sessão do Supabase a cada requisição e manda para o login quem não tem
 * sessão. Checagem otimista: a permissão de verdade é a RLS no banco.
 */
export async function atualizarSessao(request: NextRequest) {
  const { url, chavePublica } = lerAmbientePublico()
  let resposta = NextResponse.next({ request })

  const supabase = createServerClient<Database>(url, chavePublica, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, cabecalhos) => {
        for (const { name, value } of lista) request.cookies.set(name, value)
        resposta = NextResponse.next({ request })
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options)
        // Resposta que grava cookie de sessão não pode ir para cache de CDN.
        for (const [chave, valor] of Object.entries(cabecalhos)) resposta.headers.set(chave, valor)
      },
    },
  })

  // getClaims valida o JWT; não use getSession no servidor.
  const { data } = await supabase.auth.getClaims()
  const logado = Boolean(data?.claims?.sub)
  const caminho = request.nextUrl.pathname

  if (!logado && !ehRotaPublica(caminho)) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    destino.search =
      caminho === '/' || caminho === '/inicio' ? '' : `?volta=${encodeURIComponent(caminho)}`
    return copiarCookies(resposta, NextResponse.redirect(destino))
  }

  if (logado && caminho === '/login') {
    const destino = request.nextUrl.clone()
    destino.pathname = '/inicio'
    destino.search = ''
    return copiarCookies(resposta, NextResponse.redirect(destino))
  }

  return resposta
}

function copiarCookies(origem: NextResponse, destino: NextResponse) {
  for (const cookie of origem.cookies.getAll()) destino.cookies.set(cookie)
  for (const chave of ['cache-control', 'expires', 'pragma']) {
    const valor = origem.headers.get(chave)
    if (valor) destino.headers.set(chave, valor)
  }
  return destino
}
