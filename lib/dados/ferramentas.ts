import 'server-only'
import type { ChaveIcone } from '@/components/icones-ferramenta'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type TipoFerramenta = {
  id: string
  nome: string
  icone: ChaveIcone
  prefixo: string
  valor_reposicao: number
  alto_valor: boolean
  unidades: { codigo: string; status: 'livre' | 'em_uso' | 'manutencao' | 'baixada' }[]
}

export type AlteracaoValor = {
  id: string
  campo: string
  de: string | null
  para: string | null
  criado_em: string
  usuario: { nome: string } | null
}

const CAMPOS =
  'id, nome, icone, prefixo, valor_reposicao, alto_valor, ' +
  'unidades:unidade!unidade_tipo_id_obra_id_fkey (codigo, status)'

export async function listarTipos(obraId: string): Promise<TipoFerramenta[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('tipo_ferramenta')
    .select(CAMPOS)
    .eq('obra_id', obraId)
    .order('nome')
    .overrideTypes<TipoFerramenta[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar as ferramentas.')
  return data.map((t) => ({
    ...t,
    unidades: [...t.unidades].sort((a, b) => a.codigo.localeCompare(b.codigo)),
  }))
}

export async function buscarTipo(obraId: string, id: string): Promise<TipoFerramenta | null> {
  const tipos = await listarTipos(obraId)
  return tipos.find((t) => t.id === id) ?? null
}

/** Histórico de valor e de "alto valor" do tipo (log de alterações, só o engenheiro lê). */
export async function historicoDoTipo(obraId: string, id: string): Promise<AlteracaoValor[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('alteracao')
    .select('id, campo, de, para, criado_em, usuario:usuario!alteracao_usuario_id_fkey (nome)')
    .eq('obra_id', obraId)
    .eq('tabela', 'tipo_ferramenta')
    .eq('registro_id', id)
    .in('campo', ['valor_reposicao', 'alto_valor'])
    .order('criado_em', { ascending: false })
    .limit(20)
    .overrideTypes<AlteracaoValor[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar o histórico.')
  return data
}
