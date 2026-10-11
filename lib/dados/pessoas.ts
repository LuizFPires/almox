import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'

// Nunca use select * em pessoa: qr_token é fechado ao cliente.

export type PessoaCadastro = {
  id: string
  nome: string
  nome_capacete: string
  funcao: string
  matricula: string
  ativa: boolean
  empresa: { id: string; nome: string; cor: string } | null
  posses: { unidade_id: string }[]
}

const CAMPOS =
  'id, nome, nome_capacete, funcao, matricula, ativa, ' +
  'empresa:empresa!pessoa_empresa_id_obra_id_fkey (id, nome, cor), ' +
  'posses:posse!posse_pessoa_id_obra_id_fkey (unidade_id)'

export async function listarPessoas(obraId: string): Promise<PessoaCadastro[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('pessoa')
    .select(CAMPOS)
    .eq('obra_id', obraId)
    .order('nome')
    .overrideTypes<PessoaCadastro[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar as pessoas.')
  return data
}

export async function buscarPessoa(obraId: string, id: string): Promise<PessoaCadastro | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('pessoa')
    .select(CAMPOS)
    .eq('obra_id', obraId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<PessoaCadastro, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a pessoa.')
  return data
}

/** Pessoas ativas de uma empresa (para escolher o encarregado). */
export async function listarPessoasDaEmpresa(obraId: string, empresaId: string) {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('pessoa')
    .select('id, nome')
    .eq('obra_id', obraId)
    .eq('empresa_id', empresaId)
    .eq('ativa', true)
    .order('nome')
  if (error) throw new Error('Não foi possível carregar as pessoas.')
  return data
}
