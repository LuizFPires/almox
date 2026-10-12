'use server'

import { revalidatePath } from 'next/cache'
import { exigirEngenheiro } from '@/lib/acesso'
import { validarConfigTv, type CamposConfigTv } from '@/lib/dominio/tv'
import { valoresDoForm, type Valores } from '@/lib/formulario'

export type EstadoConfigTv = {
  valores?: Valores
  erro?: string
  aviso?: string
  campos?: Partial<Record<CamposConfigTv, string>>
}

/** Salva a configuração do painel da obra; a TV pega no próximo ciclo (até 2 s). */
export async function salvarConfigTv(_: EstadoConfigTv, form: FormData): Promise<EstadoConfigTv> {
  const { supabase, obraId } = await exigirEngenheiro()
  const valores = valoresDoForm(form)
  const campo = (c: CamposConfigTv) => String(form.get(c) ?? '')
  const { config, erros } = validarConfigTv({
    tempo: campo('tempo'),
    velocidade: campo('velocidade'),
    antes: campo('antes'),
    depois: campo('depois'),
    cartoes: campo('cartoes'),
  })
  if (!config) return { campos: erros, valores }

  const { error } = await supabase.rpc('salvar_config_tv', {
    p_obra: obraId,
    p_tempo_pagina_s: config.tempoPaginaS,
    p_velocidade_px_s: config.velocidadePxS,
    p_pausa_antes_ms: config.pausaAntesMs,
    p_pausa_depois_ms: config.pausaDepoisMs,
    p_cartoes_por_pagina: config.cartoesPorPagina,
  })
  if (error) return { erro: 'Não foi possível salvar a configuração.', valores }
  revalidatePath('/cadastros/painel-tv')
  return { aviso: 'Configuração salva. A TV muda em até 2 segundos.' }
}
