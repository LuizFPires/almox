'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirAdministrador } from '@/lib/administracao'
import { validarEmail } from '@/lib/dominio/cadastros'
import { valoresDoForm, type Valores } from '@/lib/formulario'
import { lerSenhaInicial } from '@/lib/senha-inicial'
import { criarClienteAdmin } from '@/lib/supabase/admin'

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
  const senhaInicial = lerSenhaInicial(form)
  if ('erro' in senhaInicial) campos.senha_inicial = senhaInicial.erro
  if (Object.keys(campos).length > 0 || !('senha' in senhaInicial)) return { campos, valores }

  const admin = criarClienteAdmin()
  const { data: existente, error: erroBusca } = await admin
    .from('usuario')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (erroBusca) return { erro: 'Não foi possível conferir o e-mail. Tente de novo.', valores }

  let usuarioId = existente?.id ?? null
  let senha: string | null = null
  const jaExistia = Boolean(usuarioId)
  if (!usuarioId) {
    senha = senhaInicial.senha
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
      app_metadata: { trocar_senha: true },
    })
    if (error || !data.user) {
      return error?.code === 'weak_password'
        ? { campos: { senha_inicial: 'Senha fraca ou já vazada. Escolha outra.' }, valores }
        : { erro: 'Não foi possível criar o login. Tente de novo.', valores }
    }
    usuarioId = data.user.id
  }

  // Com a sessão do administrador: a função confere que ele é administrador.
  const { error } = await supabase.rpc('admin_ligar_engenheiro', {
    p_obra: obraId,
    p_usuario: usuarioId,
  })
  if (error) {
    if (!jaExistia) await admin.auth.admin.deleteUser(usuarioId)
    return { erro: 'Não foi possível ligar o engenheiro. Tente de novo.', valores }
  }
  // Sem revalidar aqui: a tela recarregada fecharia o bloco e esconderia a senha. O "Pronto"
  // recarrega a obra.
  return { criado: { email, senha, jaExistia } }
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
  const { supabase, usuario } = await exigirAdministrador()
  const obraId = texto(form, 'obra_id')
  const usuarioId = texto(form, 'usuario_id')
  if (!usuarioId || usuarioId === usuario.id) return { erro: 'Acesso não encontrado.' }

  const { data: acessos, error: erroAcessos } = await supabase.rpc('admin_listar_acessos', {
    p_obra: obraId,
  })
  if (erroAcessos) return { erro: 'Não foi possível conferir o acesso. Tente de novo.' }
  if (!(acessos ?? []).some((a) => a.usuario_id === usuarioId)) {
    return { erro: 'Acesso não encontrado nesta obra.' }
  }
  const admin = criarClienteAdmin()
  const { data: outroAdmin } = await admin
    .from('administrador')
    .select('usuario_id')
    .eq('usuario_id', usuarioId)
    .maybeSingle()
  if (outroAdmin) return { erro: 'Senha de outro administrador não se troca por aqui.' }

  const senhaInicial = lerSenhaInicial(form)
  if ('erro' in senhaInicial) return { erro: senhaInicial.erro }
  const { error } = await admin.auth.admin.updateUserById(usuarioId, {
    password: senhaInicial.senha,
    app_metadata: { trocar_senha: true },
  })
  if (error) {
    return {
      erro:
        error.code === 'weak_password'
          ? 'Senha fraca ou já vazada. Escolha outra.'
          : 'Não foi possível trocar a senha. Tente de novo.',
    }
  }
  await admin.from('alteracao').insert({
    obra_id: obraId,
    tabela: 'usuario',
    registro_id: usuarioId,
    campo: 'senha',
    de: null,
    para: 'nova senha gerada pelo administrador',
    usuario_id: usuario.id,
    usuario_nome: usuario.nome || null,
  })
  return { senha: senhaInicial.senha }
}
