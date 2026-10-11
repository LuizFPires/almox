import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type Empresa = {
  id: string
  nome: string
  tipo: 'propria' | 'empreiteira'
  cor: string
  dono_nome: string | null
  dono_email: string | null
  encarregado_pessoa_id: string | null
  encarregado_email: string | null
  proxima_medicao: string | null
  encarregado: { nome: string } | null
  pessoas: { count: number }[]
}

const CAMPOS =
  'id, nome, tipo, cor, dono_nome, dono_email, encarregado_pessoa_id, encarregado_email, proxima_medicao, ' +
  'encarregado:pessoa!empresa_encarregado_mesma_empresa_fk (nome), ' +
  'pessoas:pessoa!pessoa_empresa_id_obra_id_fkey (count)'

/** Empresas da obra (RLS: só da obra do usuário), própria primeiro. */
export async function listarEmpresas(obraId: string): Promise<Empresa[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('empresa')
    .select(CAMPOS)
    .eq('obra_id', obraId)
    .order('tipo', { ascending: false })
    .order('nome')
    .overrideTypes<Empresa[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar as empresas.')
  return data
}

export async function buscarEmpresa(obraId: string, id: string): Promise<Empresa | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('empresa')
    .select(CAMPOS)
    .eq('obra_id', obraId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<Empresa, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a empresa.')
  return data
}
