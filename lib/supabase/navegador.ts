import { createBrowserClient } from '@supabase/ssr'
import { lerAmbientePublico } from './ambiente'
import type { Database } from './tipos-banco'

/** Cliente Supabase para Client Components (sessão nos cookies do navegador). */
export function criarClienteNavegador() {
  const { url, chavePublica } = lerAmbientePublico()
  // Cookie de sessão só por HTTPS quando o site está em HTTPS (APP-06).
  const secure = typeof location !== 'undefined' && location.protocol === 'https:'
  return createBrowserClient<Database>(url, chavePublica, { cookieOptions: { secure } })
}
