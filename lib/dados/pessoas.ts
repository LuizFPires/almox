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
  /** Adesivo já impresso em folha A4. */
  adesivo_impresso_em: string | null
  empresa: { id: string; nome: string; cor: string } | null
  posses: { unidade_id: string }[]
}

const CAMPOS =
  'id, nome, nome_capacete, funcao, matricula, ativa, adesivo_impresso_em, ' +
  'empresa:empresa!pessoa_empresa_id_obra_id_fkey (id, nome, cor), ' +
  'posses:posse!posse_pessoa_id_obra_id_fkey (unidade_id)'

/** A API devolve no máximo 1000 linhas por vez: a obra pode ter mais pessoas que isso. */
const PAGINA = 1000

export async function listarPessoas(obraId: string): Promise<PessoaCadastro[]> {
  const supabase = await criarClienteServidor()
  const todas: PessoaCadastro[] = []
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabase
      .from('pessoa')
      .select(CAMPOS)
      .eq('obra_id', obraId)
      .order('nome')
      .order('id')
      .range(inicio, inicio + PAGINA - 1)
      .overrideTypes<PessoaCadastro[], { merge: false }>()
    if (error) throw new Error('Não foi possível carregar as pessoas.')
    todas.push(...data)
    if (data.length < PAGINA) return todas
  }
}

/**
 * Pessoas ativas que nunca tiveram adesivo mandado para a impressora nem impresso em A4 (da
 * obra ou de uma empresa): o lote imprime só estas, então repetir o lote não imprime de novo.
 */
export async function pessoasSemAdesivo(obraId: string, empresaId?: string | null) {
  const supabase = await criarClienteServidor()
  const comAdesivo = new Set<string>()
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabase
      .from('trabalho_impressao')
      .select('pessoa_id')
      .eq('obra_id', obraId)
      .eq('tipo', 'adesivo')
      .not('pessoa_id', 'is', null)
      .order('id')
      .range(inicio, inicio + PAGINA - 1)
    if (error) throw new Error('Não foi possível carregar a fila de impressão.')
    for (const t of data) if (t.pessoa_id) comAdesivo.add(t.pessoa_id)
    if (data.length < PAGINA) break
  }
  return (await listarPessoas(obraId)).filter(
    (p) =>
      p.ativa &&
      !p.adesivo_impresso_em &&
      !comAdesivo.has(p.id) &&
      (!empresaId || p.empresa?.id === empresaId),
  )
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
