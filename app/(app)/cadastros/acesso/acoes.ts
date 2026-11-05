'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEngenheiro } from '@/lib/acesso'
import { validarEmail } from '@/lib/dominio/cadastros'
import { valoresDoForm, type Valores } from '@/lib/formulario'

type Perfil = 'engenheiro' | 'almoxarife' | 'consulta'
const PERFIS: Perfil[] = ['engenheiro', 'almoxarife', 'consulta']

export type EstadoAcesso = {
  valores?: Valores
  erro?: string
  campos?: Partial<Record<'nome' | 'email' | 'perfil' | 'empresa_id' | 'senha_inicial', string>>
  /** Mostrada uma única vez, só quando o login foi criado agora. */
  criado?: { email: string; senha: string | null; jaExistia: boolean; senhaPendente: boolean }
}

const texto = (form: FormData, chave: string) =>
  String(form.get(chave) ?? '')
    .replace(/\s+/g, ' ')
    .trim()

/** O banco recusou porque a obra ficaria sem engenheiro. */
const ultimoEngenheiro = (error: { message?: string } | null) =>
  error?.message === 'ultimo_engenheiro'

function lerPerfil(form: FormData) {
  const perfil = texto(form, 'perfil') as Perfil
  const empresa = texto(form, 'empresa_id')
  return { perfil, empresaId: perfil === 'consulta' && empresa ? empresa : null }
}

/**
 * Dá acesso à obra. Login novo nasce com senha provisória (mostrada uma vez) e com
 * troca obrigatória no primeiro acesso. Login que já existe (de outra obra) só ganha o vínculo.
 */
export async function darAcesso(_: EstadoAcesso, form: FormData): Promise<EstadoAcesso> {
  const { supabase, obraId } = await exigirEngenheiro()
  const valores = valoresDoForm(form)
  const nome = texto(form, 'nome')
  const email = texto(form, 'email').toLowerCase()
  const { perfil, empresaId } = lerPerfil(form)

  const campos: EstadoAcesso['campos'] = {}
  if (nome.length < 2) campos.nome = 'Informe o nome.'
  else if (nome.length > 120) campos.nome = 'Use até 120 caracteres.'
  const erroEmail = validarEmail(email, true)
  if (erroEmail) campos.email = erroEmail
  if (!PERFIS.includes(perfil)) campos.perfil = 'Escolha o perfil.'
  if (Object.keys(campos).length > 0) return { campos, valores }
  const { error } = await supabase.rpc('convidar_obra', {
    p_obra: obraId,
    p_email: email,
    p_perfil: perfil,
    ...(empresaId ? { p_empresa: empresaId } : {}),
  })
  if (error)
    return {
      erro: 'Não foi possível convidar. Confira se já existe acesso ou convite pendente.',
      valores,
    }
  return { criado: { email, senha: null, jaExistia: true, senhaPendente: false } }
}

export async function alterarAcesso(form: FormData) {
  const { supabase, obraId } = await exigirEngenheiro()
  const usuarioId = texto(form, 'usuario_id')
  const { perfil, empresaId } = lerPerfil(form)
  const voltar = `/cadastros/acesso/${usuarioId}`
  if (!PERFIS.includes(perfil)) redirect(`${voltar}?erro=perfil`)
  // A RLS impede o engenheiro de alterar o próprio vínculo.
  const { data, error } = await supabase
    .from('usuario_obra')
    .update({ perfil, empresa_id: empresaId })
    .eq('usuario_id', usuarioId)
    .eq('obra_id', obraId)
    .select('usuario_id')
    .maybeSingle()
  if (error || !data) {
    const motivo = ultimoEngenheiro(error)
      ? 'ultimo'
      : error?.code === '23514'
        ? 'empresa'
        : 'salvar'
    redirect(`${voltar}?erro=${motivo}`)
  }
  revalidatePath('/cadastros/usuarios')
  redirect('/cadastros/usuarios')
}

/** Tira o acesso à obra. O login continua existindo (pode ter lançado movimentos). */
export async function removerAcesso(form: FormData) {
  const { supabase, obraId } = await exigirEngenheiro()
  const usuarioId = texto(form, 'usuario_id')
  const { data, error } = await supabase
    .from('usuario_obra')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('obra_id', obraId)
    .select('usuario_id')
    .maybeSingle()
  if (error || !data) {
    redirect(
      `/cadastros/acesso/${usuarioId}?erro=${ultimoEngenheiro(error) ? 'ultimo' : 'remover'}`,
    )
  }
  revalidatePath('/cadastros/usuarios')
  redirect('/cadastros/usuarios')
}

export type EstadoNovaSenha = { erro?: string; senha?: string }

/**
 * Senha nova para alguém da obra: quem perdeu a do primeiro acesso ou esqueceu a própria (sem
 * e-mail, é o único jeito de voltar a entrar). As regras de quem pode receber estão em
 * `podeGerarNovaSenha`. A pessoa cria uma senha só dela no próximo login, e fica registrado no
 * histórico quem gerou.
 */
export async function novaSenhaProvisoria(
  _: EstadoNovaSenha,
  form: FormData,
): Promise<EstadoNovaSenha> {
  void _
  void form
  return { erro: 'Use Recuperar acesso na tela de login.' }
}
