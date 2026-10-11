import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** Pessoas ativas de uma empresa (para escolher o encarregado). Nunca use select *: qr_token é fechado. */
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
