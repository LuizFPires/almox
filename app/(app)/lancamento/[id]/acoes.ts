'use server'

import { revalidatePath } from 'next/cache'
import { exigirEngenheiro } from '@/lib/acesso'
import { enviarDepois } from '@/lib/envios/depois'

export type EstadoEstorno = { erro?: string; feito?: boolean }

/** Estorno (RN-18): só o engenheiro, com motivo; o lançamento original fica como está. */
export async function estornar(_: EstadoEstorno, form: FormData): Promise<EstadoEstorno> {
  const { supabase, obraId } = await exigirEngenheiro()
  const id = String(form.get('id') ?? '')
  const motivo = String(form.get('motivo') ?? '').trim()
  if (motivo.length < 5) return { erro: 'Escreva o motivo do estorno (pelo menos 5 letras).' }
  const { error } = await supabase.rpc('estornar_movimento', {
    p_obra: obraId,
    p_movimento: id,
    p_motivo: motivo,
  })
  if (error) {
    if (['AL006', 'AL007', '22023'].includes(error.code)) return { erro: error.message }
    return { erro: 'Não foi possível estornar. Tente de novo.' }
  }
  // Estorno de retirada encerra a posse (desconto cancelado): avisa a empreiteira.
  enviarDepois()
  revalidatePath(`/lancamento/${id}`)
  revalidatePath('/inicio')
  return { feito: true }
}
