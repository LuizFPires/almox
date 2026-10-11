import { createBrowserClient } from '@supabase/ssr'
import { lerAmbientePublico } from './ambiente'
import type { Database } from './tipos-banco'

/** Cliente Supabase para Client Components (sessão nos cookies do navegador). */
export function criarClienteNavegador() {
  const { url, chavePublica } = lerAmbientePublico()
  return createBrowserClient<Database>(url, chavePublica)
}
