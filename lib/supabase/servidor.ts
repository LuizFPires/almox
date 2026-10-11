import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { lerAmbientePublico } from './ambiente'
import type { Database } from './tipos-banco'

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers,
 * agindo como o usuário logado (RLS aplicada). Crie um por requisição.
 */
export async function criarClienteServidor() {
  const { url, chavePublica } = lerAmbientePublico()
  const loja = await cookies()
  return createServerClient<Database>(url, chavePublica, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) loja.set(name, value, options)
        } catch {
          // Server Component não grava cookies; o proxy renova a sessão.
        }
      },
    },
  })
}
