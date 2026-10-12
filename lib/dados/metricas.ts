import 'server-only'
import type { SemanaMetricas } from '@/lib/dominio/metricas'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** Métricas do piloto por semana (RPC: só o engenheiro). */
export async function buscarMetricas(obraId: string, de: string, ate: string) {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('metricas_piloto', {
    p_obra: obraId,
    p_de: de,
    p_ate: ate,
  })
  if (error) throw new Error('Não foi possível carregar as métricas.')
  return (data ?? []) as unknown as SemanaMetricas[]
}
