'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { enviarDepois } from '@/lib/envios/depois'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type EstadoEncerrar = { erro?: string }

/**
 * Encerra o dia (RN-12: só relatório e avisos, sem baixa). Os e-mails e as notificações saem
 * logo depois da resposta; o que falhar fica na fila para o agendamento tentar de novo.
 */
export async function encerrarDia(): Promise<EstadoEncerrar> {
  const { obraAtual } = await obterSessao()
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('encerrar_dia', { p_obra: obraAtual.id })
  if (error || !data) {
    return {
      erro:
        error?.code === '42501'
          ? 'Só o almoxarife ou o engenheiro encerra o dia.'
          : 'Não foi possível encerrar o dia. Tente de novo.',
    }
  }
  enviarDepois()
  revalidatePath('/fechamento')
  redirect(`/fechamento/${data}`)
}
