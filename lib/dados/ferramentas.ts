import 'server-only'
import { ehIconeArquivo, type Icone, type IconeArquivo } from '@/components/icones-ferramenta'
import { compararCodigos } from '@/lib/dominio/cadastros'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type TipoFerramenta = {
  id: string
  nome: string
  icone: Icone
  prefixo: string
  valor_reposicao: number
  alto_valor: boolean
  propriedade: 'propria' | 'alugada'
  locadora: { id: string; nome: string } | null
  unidades: { codigo: string; status: 'livre' | 'em_uso' | 'manutencao' | 'baixada' }[]
}

export type AlteracaoValor = {
  id: string
  campo: string
  de: string | null
  para: string | null
  criado_em: string
  /** Nome gravado no momento da alteração (continua se a pessoa sair da obra). */
  usuario_nome: string | null
}

const CAMPOS =
  'id, nome, icone, prefixo, valor_reposicao, alto_valor, propriedade, ' +
  'locadora:locadora!tipo_ferramenta_locadora_fk (id, nome), ' +
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
    unidades: [...t.unidades].sort((a, b) => compararCodigos(a.codigo, b.codigo)),
  }))
}

/** Um tipo, direto pelo id (antes carregava todos os tipos com todas as unidades). */
export async function buscarTipo(obraId: string, id: string): Promise<TipoFerramenta | null> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('tipo_ferramenta')
    .select(CAMPOS)
    .eq('obra_id', obraId)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<TipoFerramenta, { merge: false }>()
  if (error) throw new Error('Não foi possível carregar a ferramenta.')
  if (!data) return null
  return {
    ...data,
    unidades: [...data.unidades].sort((a, b) => compararCodigos(a.codigo, b.codigo)),
  }
}

export type TipoResumo = Pick<TipoFerramenta, 'id' | 'nome' | 'icone' | 'prefixo' | 'locadora'>

/**
 * Tipos da obra sem as unidades: o que o formulário precisa (prefixos usados, ícones próprios
 * e uso das locadoras). Com centenas de peças, evita trazer todos os códigos à toa.
 */
export async function listarTiposResumo(obraId: string): Promise<TipoResumo[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('tipo_ferramenta')
    .select('id, nome, icone, prefixo, locadora:locadora!tipo_ferramenta_locadora_fk (id, nome)')
    .eq('obra_id', obraId)
    .order('nome')
    .overrideTypes<TipoResumo[], { merge: false }>()
  if (error) throw new Error('Não foi possível carregar as ferramentas.')
  return data
}

/** Histórico de valor e de "alto valor" do tipo (log de alterações, só o engenheiro lê). */
export async function historicoDoTipo(obraId: string, id: string): Promise<AlteracaoValor[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('alteracao')
    .select('id, campo, de, para, criado_em, usuario_nome')
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

/** Ícones próprios já usados nos tipos da obra, sem repetir (para reusar no formulário). */
export function iconesProprios(tipos: Pick<TipoFerramenta, 'icone'>[]): IconeArquivo[] {
  return [...new Set(tipos.map((t) => t.icone).filter(ehIconeArquivo))]
}

export type Locadora = {
  id: string
  nome: string
  /** Tipos de ferramenta alugados dela nesta obra. */
  ferramentas: number
}

/** Locadoras da obra (para escolher de novo), as mais usadas primeiro. */
export async function listarLocadoras(
  obraId: string,
  tipos: Pick<TipoFerramenta, 'locadora'>[],
): Promise<Locadora[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase
    .from('locadora')
    .select('id, nome')
    .eq('obra_id', obraId)
    .order('nome')
  if (error) throw new Error('Não foi possível carregar as locadoras.')
  const uso = new Map<string, number>()
  for (const t of tipos) if (t.locadora) uso.set(t.locadora.id, (uso.get(t.locadora.id) ?? 0) + 1)
  return data
    .map((l) => ({ ...l, ferramentas: uso.get(l.id) ?? 0 }))
    .sort((a, b) => b.ferramentas - a.ferramentas || a.nome.localeCompare(b.nome, 'pt-BR'))
}
