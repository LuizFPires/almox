'use server'

import { revalidatePath } from 'next/cache'
import { exigirEngenheiro } from '@/lib/acesso'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ao tocar em "Imprimir": marca os adesivos como impressos em A4 (o lote não repete). */
export async function marcarImpressos(pessoas: string[]): Promise<{ ok: boolean }> {
  const { supabase, obraId } = await exigirEngenheiro()
  const ids = pessoas.filter((id) => UUID.test(id)).slice(0, 200)
  const { error } = await supabase.rpc('marcar_adesivos_impressos', {
    p_obra: obraId,
    p_pessoas: ids,
  })
  revalidatePath('/cadastros/adesivos')
  return { ok: !error }
}
