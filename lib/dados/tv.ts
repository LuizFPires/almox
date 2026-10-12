import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { PainelTv } from '@/lib/dominio/tv'
import { lerAmbientePublico } from '@/lib/supabase/ambiente'
import type { Database } from '@/lib/supabase/tipos-banco'

/** Cookie com a credencial da TV (httpOnly, só nas rotas da TV). */
export const COOKIE_TV = 'almox_tv'

/** Credencial da TV: 64 hex (trocar_codigo_tv). Qualquer outra coisa nem vai ao banco. */
export function tokenValido(token: string | undefined | null): token is string {
  return typeof token === 'string' && /^[0-9a-f]{64}$/.test(token)
}

/** Código de pareamento: 32 hex, vale 10 minutos e uma vez (gerar_codigo_tv). */
export function codigoValido(codigo: string | undefined | null): codigo is string {
  return typeof codigo === 'string' && /^[0-9a-f]{32}$/.test(codigo)
}

export type ResultadoPainel =
  | { tipo: 'ok'; painel: PainelTv }
  /** Nada mudou desde `versao`: só a hora do servidor. */
  | { tipo: 'igual'; agora: string }
  | { tipo: 'nao_autorizado' }
  | { tipo: 'erro' }

/** A TV entra só com a chave pública: cada chamada é anônima e o banco confere a credencial. */
function clienteAnonimo() {
  const { url, chavePublica } = lerAmbientePublico()
  return createClient<Database>(url, chavePublica, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Lê o painel pela credencial da TV. Só "dispositivo não autorizado" (AL008) desliga a TV;
 * qualquer outro erro (inclusive falta de permissão no banco) é passageiro e ela tenta de novo.
 */
export async function lerPainel(
  token: string | undefined | null,
  versao?: string | null,
): Promise<ResultadoPainel> {
  if (!tokenValido(token)) return { tipo: 'nao_autorizado' }
  const { data, error } = await clienteAnonimo().rpc('painel_tv', {
    p_token: token,
    p_versao: versao && /^[0-9a-f]{32}$/.test(versao) ? versao : undefined,
  })
  if (error) return error.code === 'AL008' ? { tipo: 'nao_autorizado' } : { tipo: 'erro' }
  const resposta = data as unknown as PainelTv | { versao: string; agora: string }
  if (!('pessoas' in resposta)) return { tipo: 'igual', agora: resposta.agora }
  return { tipo: 'ok', painel: resposta }
}

/** Troca o código de pareamento pela credencial da TV (null: vencido, usado ou revogado). */
export async function trocarCodigo(codigo: string): Promise<string | null> {
  const { data, error } = await clienteAnonimo().rpc('trocar_codigo_tv', { p_codigo: codigo })
  if (error || typeof data !== 'string' || !tokenValido(data)) return null
  return data
}

/** Cookie da TV: renovado a cada resposta, então só vence se a TV ficar 400 dias desligada. */
export const OPCOES_COOKIE_TV = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/tv',
  maxAge: 400 * 24 * 60 * 60, // o máximo que os navegadores aceitam
}
