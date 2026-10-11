'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirEngenheiro } from '@/lib/acesso'
import { validarEmail } from '@/lib/dominio/cadastros'
import { gerarSenhaProvisoria } from '@/lib/dominio/senha'
import { valoresDoForm, type Valores } from '@/lib/formulario'
import { criarClienteAdmin } from '@/lib/supabase/admin'

type Perfil = 'engenheiro' | 'almoxarife' | 'consulta'
const PERFIS: Perfil[] = ['engenheiro', 'almoxarife', 'consulta']

export type EstadoAcesso = {
  valores?: Valores
  erro?: string
  campos?: Partial<Record<'nome' | 'email' | 'perfil' | 'empresa_id', string>>
  /** Mostrada uma única vez, só quando o login foi criado agora. */
  criado?: { email: string; senha: string | null; jaExistia: boolean; senhaPendente: boolean }
}

const texto = (form: FormData, chave: string) =>
  String(form.get(chave) ?? '')
    .replace(/\s+/g, ' ')
    .trim()

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
  const erroEmail = validarEmail(email, true)
  if (erroEmail) campos.email = erroEmail
  if (!PERFIS.includes(perfil)) campos.perfil = 'Escolha o perfil.'
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
    senha = gerarSenhaProvisoria()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
      app_metadata: { trocar_senha: true },
    })
    if (error || !data.user)
      return { erro: 'Não foi possível criar o login. Tente de novo.', valores }
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
  if (error || !data) redirect(`${voltar}?erro=${error?.code === '23514' ? 'empresa' : 'salvar'}`)
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
  if (error || !data) redirect(`/cadastros/acesso/${usuarioId}?erro=remover`)
  revalidatePath('/cadastros/usuarios')
  redirect('/cadastros/usuarios')
}
