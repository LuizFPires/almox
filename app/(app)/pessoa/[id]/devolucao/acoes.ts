'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { podeLancar } from '@/lib/dominio/permissoes'
import { enviarDepois } from '@/lib/envios/depois'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type PedidoDevolucao = {
  pessoaId: string
  /** Id da conferência do capacete (M4); sem ele, só voltam itens que saíram sem QR. */
  identificacao: string | null
  itens: { tipo: string; quantidade: number; avarias: { motivo: string; foto: string }[] }[]
  /** Gerada ao abrir a devolução: repetir o pedido (resposta perdida) não duplica. */
  chave: string
}

export type FalhaDevolucao = { erro: string; motivo: 'conferencia' | 'foto' | 'outro' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Registrar devolução: tudo no servidor (RPC transacional) e abre a tela de sucesso. */
export async function registrarDevolucao(pedido: PedidoDevolucao): Promise<FalhaDevolucao> {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) {
    return { erro: 'Só o almoxarife e o engenheiro lançam devoluções.', motivo: 'outro' }
  }
  if (pedido.identificacao !== null && !UUID.test(pedido.identificacao)) {
    return {
      erro: 'A conferência do capacete não vale mais. Leia o capacete de novo.',
      motivo: 'conferencia',
    }
  }
  const supabase = await criarClienteServidor()
  const { data: movimento, error } = await supabase.rpc('registrar_devolucao', {
    p_obra: obraAtual.id,
    p_pessoa: pedido.pessoaId,
    // null = sem QR; o gerador de tipos não marca argumento de função como opcional.
    p_identificacao: pedido.identificacao as string,
    p_itens: pedido.itens,
    p_chave: UUID.test(pedido.chave) ? pedido.chave : undefined,
  })
  if (error || !movimento) {
    if (error?.code === 'AL001') return { erro: error.message, motivo: 'conferencia' }
    if (error?.code === 'AL005') return { erro: error.message, motivo: 'foto' }
    if (error && ['AL003', 'AL004', '22023'].includes(error.code)) {
      return { erro: error.message, motivo: 'outro' }
    }
    return { erro: 'Não foi possível registrar a devolução. Tente de novo.', motivo: 'outro' }
  }
  // Peça de empreiteira devolvida antes da medição: desconto cancelado, empreiteira avisada.
  enviarDepois()
  revalidatePath('/inicio')
  redirect(`/pessoa/${pedido.pessoaId}/devolucao/feita?mov=${movimento}`)
}
