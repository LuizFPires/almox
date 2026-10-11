import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type DevolucaoFeita = {
  id: string
  via: 'qr' | 'manual'
  criado_em: string
  pessoa: { id: string; nome: string } | null
  itens: {
    avariada: boolean
    unidade: { codigo: string; tipo: { nome: string } | null } | null
  }[]
}

/** Movimento de devolução para a tela de sucesso (a RLS limita à obra e à empresa). */
export async function buscarDevolucao(obraId: string, id: string): Promise<DevolucaoFeita | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('movimento')
    .select(
      'id, via, criado_em, pessoa:pessoa!movimento_pessoa_id_obra_id_fkey (id, nome), ' +
        'itens:movimento_item!movimento_item_movimento_id_obra_id_fkey (avariada, ' +
        'unidade:unidade!movimento_item_unidade_id_obra_id_fkey (codigo, tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome)))',
    )
    .eq('obra_id', obraId)
    .eq('id', id)
    .eq('tipo', 'devolucao')
    .maybeSingle()
    .overrideTypes<DevolucaoFeita, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a devolução.')
  return data
}
