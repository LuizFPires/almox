import 'server-only'
import { podeCadastrar, podeLancar } from '@/lib/dominio/permissoes'
import { obterSessao } from '@/lib/sessao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export class SemPermissao extends Error {
  constructor() {
    super('Só o engenheiro da obra pode fazer isso.')
  }
}

/**
 * Primeira linha de toda Server Action de cadastro: confere o perfil na obra ativa.
 * A RLS no banco repete a checagem; isto dá a mensagem certa antes de tentar gravar.
 */
export async function exigirEngenheiro() {
  const sessao = await obterSessao()
  if (!podeCadastrar(sessao.obraAtual.perfil)) throw new SemPermissao()
  const supabase = await criarClienteServidor()
  return { ...sessao, supabase, obraId: sessao.obraAtual.id }
}

/** Engenheiro ou almoxarife (quem lança): conectar e desconectar a TV do painel. */
export async function exigirLancador() {
  const sessao = await obterSessao()
  if (!podeLancar(sessao.obraAtual.perfil)) throw new SemPermissao()
  const supabase = await criarClienteServidor()
  return { ...sessao, supabase, obraId: sessao.obraAtual.id }
}
