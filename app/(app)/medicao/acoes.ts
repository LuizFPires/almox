'use server'

import { revalidatePath } from 'next/cache'
import { exigirEngenheiro } from '@/lib/acesso'

export type EstadoMedicao = { erro?: string; aviso?: string }

/**
 * O engenheiro fecha a medição da empreiteira: os descontos em aberto viram "descontado" e a
 * data da próxima medição fica no cadastro.
 */
export async function fecharMedicao(_: EstadoMedicao, form: FormData): Promise<EstadoMedicao> {
  const { supabase, obraId } = await exigirEngenheiro()
  const empresa = String(form.get('empresa') ?? '')
  const proxima = String(form.get('proxima') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(proxima)) {
    return { erro: 'Informe a data da próxima medição.' }
  }
  const { error } = await supabase.rpc('fechar_medicao', {
    p_obra: obraId,
    p_empresa: empresa,
    p_proxima: proxima,
  })
  if (error) {
    return {
      erro:
        error.code === '22023'
          ? 'A próxima medição tem que ser depois de hoje.'
          : 'Não foi possível fechar a medição. Tente de novo.',
    }
  }
  revalidatePath('/medicao')
  return { aviso: 'Medição fechada. Os valores em aberto foram confirmados para desconto.' }
}
