import 'server-only'
import type { Metricas } from '@/lib/dominio/metricas'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** Métricas do piloto por semana e o total do período (RPC: só o engenheiro). */
export async function buscarMetricas(obraId: string, de: string, ate: string): Promise<Metricas> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('metricas_piloto', {
    p_obra: obraId,
    p_de: de,
    p_ate: ate,
  })
  if (error) throw new Error('Não foi possível carregar as métricas.')
  const m = (data ?? {}) as unknown as Partial<Metricas>
  return {
    semanas: m.semanas ?? [],
    total: m.total ?? { tempoMedidas: 0, tempoMedianaS: null, tempoMedioS: null, tempoAte15s: 0 },
  }
}
