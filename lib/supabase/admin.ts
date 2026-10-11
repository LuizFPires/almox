import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { lerAmbientePublico } from './ambiente'
import type { Database } from './tipos-banco'

/**
 * Cliente administrador (chave secreta): ignora a RLS. Use só em Server Actions,
 * depois de conferir o perfil (exigirEngenheiro), e só para o que o usuário não
 * consegue fazer com a própria sessão: criar login e marcar troca de senha.
 */
export function criarClienteAdmin() {
  const { url } = lerAmbientePublico()
  const chave = process.env.SUPABASE_SECRET_KEY
  if (!chave) throw new Error('SUPABASE_SECRET_KEY ausente. Veja .env.example.')
  return createClient<Database>(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
