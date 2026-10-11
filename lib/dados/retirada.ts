import 'server-only'
import type { TipoParaRetirar } from '@/lib/dominio/retirada'
import { criarClienteServidor } from '@/lib/supabase/servidor'

type TipoComUnidades = {
  id: string
  nome: string
  icone: string
  alto_valor: boolean
  unidades: { codigo: string }[]
}

/** Tipos da obra com os códigos das unidades livres (a grade mostra todos os tipos). */
export async function tiposParaRetirar(obraId: string): Promise<TipoParaRetirar[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('tipo_ferramenta')
    .select('id, nome, icone, alto_valor, unidades:unidade!unidade_tipo_id_obra_id_fkey (codigo)')
    .eq('obra_id', obraId)
    .eq('unidades.status', 'livre')
    .order('nome')
    .overrideTypes<TipoComUnidades[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar as ferramentas.')
  return data.map((t) => ({
    id: t.id,
    nome: t.nome,
    icone: t.icone,
    altoValor: t.alto_valor,
    livres: t.unidades.map((u) => u.codigo),
  }))
}

export type RetiradaFeita = {
  id: string
  via: 'qr' | 'manual'
  criado_em: string
  pessoa: { id: string; nome: string } | null
  itens: { unidade: { codigo: string; tipo: { nome: string } | null } | null }[]
}

/** Movimento de retirada para a tela de sucesso (a RLS limita à obra do usuário). */
export async function buscarRetirada(obraId: string, id: string): Promise<RetiradaFeita | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('movimento')
    .select(
      'id, via, criado_em, pessoa:pessoa!movimento_pessoa_id_obra_id_fkey (id, nome), ' +
        'itens:movimento_item!movimento_item_movimento_id_obra_id_fkey (' +
        'unidade:unidade!movimento_item_unidade_id_obra_id_fkey (codigo, tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (nome)))',
    )
    .eq('obra_id', obraId)
    .eq('id', id)
    .eq('tipo', 'retirada')
    .maybeSingle()
    .overrideTypes<RetiradaFeita, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a retirada.')
  return data
}
