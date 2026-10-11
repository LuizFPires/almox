'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type PedidoRetirada = {
  pessoaId: string
  /** Id da conferência do capacete (M4); sem ele a retirada é manual. */
  identificacao: string | null
  itens: { tipo: string; quantidade: number }[]
  confirmado: boolean
}

export type FalhaRetirada = { erro: string; motivo: 'conferencia' | 'acabou' | 'outro' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Concluir retirada: grava tudo no servidor (RPC transacional) e abre a tela de sucesso. */
export async function registrarRetirada(pedido: PedidoRetirada): Promise<FalhaRetirada> {
  const { obraAtual } = await obterSessao()
  if (!podeLancar(obraAtual.perfil)) {
    return { erro: 'Só o almoxarife e o engenheiro lançam retiradas.', motivo: 'outro' }
  }
  const identificacao =
    pedido.identificacao && UUID.test(pedido.identificacao) ? pedido.identificacao : null
  const supabase = await criarClienteServidor()
  const { data: movimento, error } = await supabase.rpc('registrar_retirada', {
    p_obra: obraAtual.id,
    p_pessoa: pedido.pessoaId,
    // null = manual; o gerador de tipos não marca argumento de função como opcional.
    p_identificacao: identificacao as string,
    p_itens: pedido.itens.map((i) => ({ tipo: i.tipo, quantidade: i.quantidade })),
    p_confirmado: pedido.confirmado,
  })
  if (error || !movimento) {
    if (error?.code === 'AL001') return { erro: error.message, motivo: 'conferencia' }
    if (error?.code === 'AL002') return { erro: error.message, motivo: 'acabou' }
    if (error?.code === '22023') return { erro: error.message, motivo: 'outro' }
    return { erro: 'Não foi possível registrar a retirada. Tente de novo.', motivo: 'outro' }
  }
  revalidatePath('/inicio')
  redirect(`/pessoa/${pedido.pessoaId}/retirada/feita?mov=${movimento}`)
}
