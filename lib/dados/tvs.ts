import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type TvConectada = {
  id: string
  nome: string
  criado_em: string
  /** Último sinal da TV (no máximo um por minuto); null: ainda não abriu o painel. */
  ultimo_ping_tv: string | null
}

/** TVs "só painel" ativas da obra (RLS: quem lança na obra). Sem token: só nome e sinal. */
export async function tvsDaObra(obraId: string): Promise<TvConectada[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('dispositivo_tv')
    .select('id, nome, criado_em, ultimo_ping_tv')
    .eq('obra_id', obraId)
    .eq('so_painel', true)
    .is('revogado_em', null)
    .order('criado_em')
  if (error) throw new Error('Não foi possível carregar as TVs.')
  return data
}
