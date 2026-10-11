import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type Acesso = {
  usuario_id: string
  nome: string
  email: string
  perfil: 'engenheiro' | 'almoxarife' | 'consulta'
  empresa_id: string | null
  empresa_nome: string | null
  desde: string
}

/** Acessos da obra com e-mail (RPC que só responde ao engenheiro). */
export async function listarAcessos(obraId: string): Promise<Acesso[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('listar_acessos', { p_obra: obraId })
  if (error) throw new Error('Não foi possível carregar os acessos.')
  return data
}
