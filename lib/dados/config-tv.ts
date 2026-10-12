import 'server-only'
import { CONFIG_PADRAO, type ConfigTv } from '@/lib/dominio/tv'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** Configuração do painel da obra (sem linha = padrões do PRD). */
export async function configDaObra(obraId: string): Promise<ConfigTv> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('config_tv')
    .select('tempo_pagina_s, velocidade_px_s, pausa_antes_ms, pausa_depois_ms, cartoes_por_pagina')
    .eq('obra_id', obraId)
    .maybeSingle()
  if (error) throw new Error('Não foi possível carregar a configuração do painel.')
  if (!data) return CONFIG_PADRAO
  return {
    tempoPaginaS: data.tempo_pagina_s,
    velocidadePxS: data.velocidade_px_s,
    pausaAntesMs: data.pausa_antes_ms,
    pausaDepoisMs: data.pausa_depois_ms,
    cartoesPorPagina: data.cartoes_por_pagina,
  }
}
