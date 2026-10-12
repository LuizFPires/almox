import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { PainelTv } from '@/lib/dominio/tv'
import { lerAmbientePublico } from '@/lib/supabase/ambiente'
import type { Database } from '@/lib/supabase/tipos-banco'

/** Cookie com o token do dispositivo (httpOnly, só nas rotas da TV). */
export const COOKIE_TV = 'almox_tv'

/** Token do dispositivo: 64 hex (criar_dispositivo). Qualquer outra coisa nem vai ao banco. */
export function tokenValido(token: string | undefined | null): token is string {
  return typeof token === 'string' && /^[0-9a-f]{64}$/.test(token)
}

export type ResultadoPainel =
  { tipo: 'ok'; painel: PainelTv } | { tipo: 'nao_autorizado' } | { tipo: 'erro' }

/**
 * Lê o painel com a chave pública e o token do dispositivo (a TV não tem login). Sem sessão:
 * cada chamada é anônima e o banco confere o token (`painel_tv`).
 */
export async function lerPainel(token: string | undefined | null): Promise<ResultadoPainel> {
  if (!tokenValido(token)) return { tipo: 'nao_autorizado' }
  const { url, chavePublica } = lerAmbientePublico()
  const supabase = createClient<Database>(url, chavePublica, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.rpc('painel_tv', { p_token: token })
  if (error) return error.code === '42501' ? { tipo: 'nao_autorizado' } : { tipo: 'erro' }
  return { tipo: 'ok', painel: data as unknown as PainelTv }
}
