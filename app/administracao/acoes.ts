'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirAdministrador } from '@/lib/administracao'
import { validarEmail } from '@/lib/dominio/cadastros'
import { valoresDoForm, type Valores } from '@/lib/formulario'

const texto = (form: FormData, chave: string) =>
  String(form.get(chave) ?? '')
    .replace(/\s+/g, ' ')
    .trim()

export type EstadoObra = {
  valores?: Valores
  erro?: string
  campos?: Partial<Record<'nome' | 'endereco', string>>
}

function lerObra(form: FormData) {
  const nome = texto(form, 'nome')
  const endereco = texto(form, 'endereco')
  const campos: EstadoObra['campos'] = {}
  if (nome.length < 2) campos.nome = 'Informe o nome da obra.'
  else if (nome.length > 120) campos.nome = 'Use até 120 caracteres.'
  if (endereco.length > 200) campos.endereco = 'Use até 200 caracteres.'
  return { nome, endereco, campos }
}

/** Obra nova: depois de criada, a tela dela pede o engenheiro. */
export async function criarObra(_: EstadoObra, form: FormData): Promise<EstadoObra> {
  const { supabase } = await exigirAdministrador()
  const valores = valoresDoForm(form)
  const { nome, endereco, campos } = lerObra(form)
  if (Object.keys(campos).length > 0) return { campos, valores }
  const { data, error } = await supabase.rpc('admin_criar_obra', {
    p_nome: nome,
    p_endereco: endereco,
  })
  if (error || !data) return { erro: 'Não foi possível criar a obra. Tente de novo.', valores }
  revalidatePath('/administracao')
  redirect(`/administracao/obra/${data}?nova=1`)
}

export async function editarObra(_: EstadoObra, form: FormData): Promise<EstadoObra> {
  const { supabase } = await exigirAdministrador()
  const valores = valoresDoForm(form)
  const obraId = texto(form, 'obra_id')
  const { nome, endereco, campos } = lerObra(form)
  if (Object.keys(campos).length > 0) return { campos, valores }
  const { error } = await supabase.rpc('admin_editar_obra', {
    p_obra: obraId,
    p_nome: nome,
    p_endereco: endereco,
  })
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.', valores }
  revalidatePath('/administracao')
  redirect('/administracao')
}

/** Ativa, desativa (some do app) ou encerra (também conta o prazo da LGPD). */
export async function mudarSituacao(form: FormData) {
  const { supabase } = await exigirAdministrador()
  const obraId = texto(form, 'obra_id')
  const situacao = texto(form, 'situacao')
  const { error } = await supabase.rpc('admin_situacao_obra', {
    p_obra: obraId,
    p_situacao: situacao,
  })
  if (error) redirect(`/administracao/obra/${obraId}?erro=situacao`)
  revalidatePath('/administracao')
  revalidatePath('/', 'layout')
  redirect(`/administracao/obra/${obraId}`)
}

export type EstadoEngenheiro = {
  valores?: Valores
  erro?: string
  campos?: Partial<Record<'nome' | 'email' | 'senha_inicial', string>>
  /** Mostrada uma única vez, só quando o login foi criado agora. */
  criado?: { email: string; senha: string | null; jaExistia: boolean }
}

/**
 * Engenheiro da obra. Login novo nasce com senha do primeiro acesso (troca obrigatória); login
 * que já existe (de outra obra) só ganha o vínculo, sem mexer na senha.
 */
export async function ligarEngenheiro(
  _: EstadoEngenheiro,
  form: FormData,
): Promise<EstadoEngenheiro> {
  const { supabase } = await exigirAdministrador()
  const valores = valoresDoForm(form)
  const obraId = texto(form, 'obra_id')
  const nome = texto(form, 'nome')
  const email = texto(form, 'email').toLowerCase()

  const campos: EstadoEngenheiro['campos'] = {}
  if (nome.length < 2) campos.nome = 'Informe o nome.'
  else if (nome.length > 120) campos.nome = 'Use até 120 caracteres.'
  const erroEmail = validarEmail(email, true)
  if (erroEmail) campos.email = erroEmail
  if (Object.keys(campos).length > 0) return { campos, valores }
  const { error } = await supabase.rpc('convidar_obra', {
    p_obra: obraId,
    p_email: email,
    p_perfil: 'engenheiro',
  })
  if (error)
    return {
      erro: 'Não foi possível convidar. Confira se já existe acesso ou convite pendente.',
      valores,
    }
  return { criado: { email, senha: null, jaExistia: true } }
}

export type EstadoSenhaAdmin = { erro?: string; senha?: string }

/**
 * Senha nova para qualquer pessoa de uma obra (inclusive engenheiro e quem está em várias
 * obras). Não vale para outro administrador nem para si mesmo. A pessoa cria a dela no
 * próximo login; o histórico da obra registra quem gerou.
 */
export async function senhaNovaAdmin(
  _: EstadoSenhaAdmin,
  form: FormData,
): Promise<EstadoSenhaAdmin> {
  void _
  void form
  return { erro: 'A senha é pessoal. Use Recuperar acesso na tela de login.' }
}
