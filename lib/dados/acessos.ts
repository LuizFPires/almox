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

export type ContaSemObra = { usuario_id: string; nome: string; email: string; criado_em: string }

/**
 * Contas criadas pela tela pública (e-mail confirmado) que ainda não são de obra nenhuma. Login de
 * outra obra não entra aqui: para ele, o engenheiro digita o e-mail em "Dar acesso".
 */
export async function listarContasSemObra(obraId: string): Promise<ContaSemObra[]> {
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.rpc('listar_contas_sem_obra', { p_obra: obraId })
  if (error) throw new Error('Não foi possível carregar as contas aguardando obra.')
  return data
}
