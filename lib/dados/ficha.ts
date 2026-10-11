import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'

// Nunca use select * em pessoa: qr_token é fechado ao cliente.

export type ItemComPessoa = {
  unidade_id: string
  desde: string
  via: 'qr' | 'manual'
  unidade: {
    codigo: string
    tipo: { id: string; nome: string; icone: string; alto_valor: boolean } | null
  } | null
}

export type FichaPessoa = {
  id: string
  nome: string
  nome_capacete: string
  funcao: string
  matricula: string
  ativa: boolean
  empresa: { id: string; nome: string; cor: string } | null
  posses: ItemComPessoa[]
}

export type Colega = { id: string; nome: string; nome_capacete: string; itens: number }

/** Ficha (F-04): pessoa, empresa e o que está com ela (a RLS esconde outra empresa). */
export async function buscarFicha(obraId: string, id: string): Promise<FichaPessoa | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('pessoa')
    .select(
      'id, nome, nome_capacete, funcao, matricula, ativa, ' +
        'empresa:empresa!pessoa_empresa_id_obra_id_fkey (id, nome, cor), ' +
        'posses:posse!posse_pessoa_id_obra_id_fkey (unidade_id, desde, via, ' +
        'unidade:unidade!posse_unidade_id_obra_id_fkey (codigo, ' +
        'tipo:tipo_ferramenta!unidade_tipo_id_obra_id_fkey (id, nome, icone, alto_valor)))',
    )
    .eq('obra_id', obraId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<FichaPessoa, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a ficha.')
  if (!data) return null
  data.posses.sort((a, b) => a.desde.localeCompare(b.desde))
  return data
}

/** Equipe da mesma empresa (ativas), com quantos itens cada um tem agora. */
export async function equipeDaEmpresa(
  obraId: string,
  empresaId: string,
  semPessoa: string,
): Promise<Colega[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('pessoa')
    .select('id, nome, nome_capacete, posses:posse!posse_pessoa_id_obra_id_fkey (unidade_id)')
    .eq('obra_id', obraId)
    .eq('empresa_id', empresaId)
    .eq('ativa', true)
    .neq('id', semPessoa)
    .order('nome')
  if (error) throw new Error('Não foi possível carregar a equipe.')
  return data.map((p) => ({
    id: p.id,
    nome: p.nome,
    nome_capacete: p.nome_capacete,
    itens: p.posses.length,
  }))
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A identificação (id vindo da conferência) ainda vale para este usuário e é desta pessoa?
 * Devolve até quando vale, ou null.
 */
export async function identificacaoValida(
  obraId: string,
  identificacao: string | undefined,
  pessoaId: string,
): Promise<string | null> {
  if (!identificacao || !UUID.test(identificacao)) return null
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .rpc('identificacao_valida', { p_obra: obraId, p_identificacao: identificacao })
    .maybeSingle()
  if (error || !data || data.pessoa_id !== pessoaId) return null
  return data.expira_em
}
