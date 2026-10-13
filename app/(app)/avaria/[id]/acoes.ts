'use server'

import { revalidatePath } from 'next/cache'
import { exigirEngenheiro } from '@/lib/acesso'
import { lerBRL } from '@/lib/formatos/moeda'

export type EstadoIndenizacao = { erro?: string; ok?: boolean }

/** Engenheiro ajusta a indenização da avaria (vazio = volta ao valor de reposição). */
export async function ajustarIndenizacao(
  _: EstadoIndenizacao,
  form: FormData,
): Promise<EstadoIndenizacao> {
  const { supabase } = await exigirEngenheiro()
  const id = String(form.get('id') ?? '')
  const texto = String(form.get('valor') ?? '').trim()
  const reposicao = form.get('reposicao') === '1'
  let centavos: number | undefined
  if (!reposicao) {
    // Zero vale: o engenheiro pode dispensar a cobrança.
    const valor = lerBRL(texto)
    if (valor === null || valor < 0) return { erro: 'Valor inválido. Use o formato 2.890,00.' }
    centavos = valor
  }
  const { error } = await supabase.rpc('definir_indenizacao', {
    p_avaria: id,
    ...(centavos === undefined ? {} : { p_valor: centavos }),
  })
  if (error) {
    return {
      erro:
        error.code === '42501'
          ? 'Só o engenheiro da obra ajusta a indenização.'
          : 'Não foi possível salvar. Tente de novo.',
    }
  }
  revalidatePath(`/avaria/${id}`)
  revalidatePath('/lista')
  return { ok: true }
}
