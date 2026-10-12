import 'server-only'
import type { FiltrosHistorico, LinhaHistorico } from '@/lib/dominio/historico'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** Histórico da obra com os filtros (RPC: só o engenheiro; até 2000 linhas). */
export async function buscarHistorico(
  obraId: string,
  f: FiltrosHistorico,
): Promise<LinhaHistorico[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('historico', {
    p_obra: obraId,
    p_de: f.de,
    p_ate: f.ate,
    p_pessoa: f.pessoa ?? undefined,
    p_empresa: f.empresa ?? undefined,
    p_tipo: f.tipo ?? undefined,
    p_via: f.via ?? undefined,
    p_categoria: f.categoria ?? undefined,
  })
  if (error) throw new Error('Não foi possível carregar o histórico.')
  return (data ?? []) as unknown as LinhaHistorico[]
}
