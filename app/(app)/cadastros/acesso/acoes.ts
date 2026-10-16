'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEngenheiro } from '@/lib/acesso'
import { validarEmail } from '@/lib/dominio/cadastros'
import { podeGerarNovaSenha } from '@/lib/dominio/nova-senha'
import { gerarSenhaProvisoria } from '@/lib/dominio/senha'
import { valoresDoForm, type Valores } from '@/lib/formulario'
import { lerSenhaInicial } from '@/lib/senha-inicial'
import { criarClienteAdmin } from '@/lib/supabase/admin'

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
  const senhaInicial = lerSenhaInicial(form)
  if ('erro' in senhaInicial) campos.senha_inicial = senhaInicial.erro
  if (Object.keys(campos).length > 0) return { campos, valores }

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
  // Login que já existe (de outra obra): só ganha o vínculo. NUNCA troque nem mostre a
  // senha dele aqui — o engenheiro desta obra entraria na conta de quem é de outra obra.
  if (!usuarioId) {
    // O erro da senha escolhida já voltou acima: aqui ela sempre existe.
    senha = 'senha' in senhaInicial ? senhaInicial.senha : gerarSenhaProvisoria()
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

  // Vínculo com a sessão do engenheiro: a RLS confere que ele é engenheiro desta obra.
  const { error } = await supabase
    .from('usuario_obra')
    .insert({ usuario_id: usuarioId, obra_id: obraId, perfil, empresa_id: empresaId })
  if (error) {
    // Login criado agora sem vínculo não serve para nada: desfaz.
    if (!jaExistia) await admin.auth.admin.deleteUser(usuarioId)
    if (error.code === '23505')
      return { campos: { email: 'Esta pessoa já tem acesso à obra.' }, valores }
    if (error.code === '23514') {
      return { campos: { empresa_id: 'Consulta restrita só para empreiteira.' }, valores }
    }
    return { erro: 'Não foi possível dar o acesso. Tente de novo.', valores }
  }

  revalidatePath('/cadastros/usuarios')
  // Só para escolher a mensagem: a pessoa ainda não criou a própria senha?
  const senhaPendente =
    jaExistia &&
    Boolean((await admin.auth.admin.getUserById(usuarioId)).data.user?.app_metadata?.trocar_senha)
  return { criado: { email, senha, jaExistia, senhaPendente } }
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
  const { supabase, obraId, usuario } = await exigirEngenheiro()
  const usuarioId = texto(form, 'usuario_id')
  if (!usuarioId || usuarioId === usuario.id) return { erro: 'Acesso não encontrado.' }
  // A RLS confere que o login é desta obra (o engenheiro só lê os vínculos da obra dele).
  const { data: vinculo } = await supabase
    .from('usuario_obra')
    .select('usuario_id, perfil')
    .eq('usuario_id', usuarioId)
    .eq('obra_id', obraId)
    .maybeSingle()
  if (!vinculo) return { erro: 'Acesso não encontrado nesta obra.' }

  const admin = criarClienteAdmin()
  const [
    { data: vinculos, error: erroVinculos },
    { data: atual },
    { data: ehAdmin, error: erroAdmin },
  ] = await Promise.all([
    admin.from('usuario_obra').select('obra_id').eq('usuario_id', usuarioId),
    admin.auth.admin.getUserById(usuarioId),
    admin.from('administrador').select('usuario_id').eq('usuario_id', usuarioId).maybeSingle(),
  ])
  // Na dúvida, recusa: senha de administrador nas mãos do engenheiro seria virar administrador.
  if (erroVinculos || erroAdmin || !atual.user) {
    return { erro: 'Não foi possível conferir o acesso. Tente de novo.' }
  }
  const decisao = podeGerarNovaSenha(
    {
      senhaPendente: Boolean(atual.user.app_metadata?.trocar_senha),
      perfil: vinculo.perfil,
      obras: (vinculos ?? []).map((v) => v.obra_id),
      administrador: Boolean(ehAdmin),
    },
    obraId,
  )
  if (!decisao.pode) return { erro: decisao.motivo }

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
  // Histórico da obra: quem gerou a senha nova, sem a senha.
  await admin.from('alteracao').insert({
    obra_id: obraId,
    tabela: 'usuario',
    registro_id: usuarioId,
    campo: 'senha',
    de: null,
    para: 'nova senha gerada pelo engenheiro',
    usuario_id: usuario.id,
    usuario_nome: usuario.nome || null,
  })
  return { senha: senhaInicial.senha }
}
