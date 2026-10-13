'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirLancador } from '@/lib/acesso'

export type EstadoConectarTv = { erro?: string; conectada?: string; codigo?: string; nome?: string }

/** Engenheiro ou almoxarife aprova o código que aparece na TV. */
export async function conectarTv(_: EstadoConectarTv, form: FormData): Promise<EstadoConectarTv> {
  const { supabase, obraId } = await exigirLancador()
  const codigo = String(form.get('codigo') ?? '').replace(/\D/g, '')
  const nome = String(form.get('nome') ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (codigo.length !== 6) return { erro: 'Digite os 6 números que aparecem na TV.', codigo, nome }
  if (nome.length > 60) return { erro: 'Nome da TV com até 60 letras.', codigo, nome }
  const { error } = await supabase.rpc('aprovar_pareamento_tv', {
    p_obra: obraId,
    p_codigo: codigo,
    p_nome: nome || undefined,
  })
  if (error) {
    return {
      erro:
        error.code === 'P0002'
          ? 'Código não encontrado ou vencido. Confira o número na TV.'
          : error.code === '42501'
            ? 'Só o engenheiro ou o almoxarife da obra conecta uma TV.'
            : 'Não foi possível conectar. Tente de novo.',
      codigo,
      nome,
    }
  }
  revalidatePath('/conectar-tv')
  return { conectada: nome || 'TV do almoxarifado' }
}

/** Desconecta uma TV "só painel" da obra (ela volta a mostrar o código). */
export async function desconectarTv(form: FormData): Promise<void> {
  const { supabase } = await exigirLancador()
  const { error } = await supabase.rpc('desconectar_tv', {
    p_dispositivo: String(form.get('id') ?? ''),
  })
  revalidatePath('/conectar-tv')
  if (error) redirect('/conectar-tv?erro=desconectar')
}
