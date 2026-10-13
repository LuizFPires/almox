'use server'

import { redirect } from 'next/navigation'
import {
  DIGITOS_CODIGO,
  limparCodigo,
  mensagemErroCodigo,
  mensagemErroNovaSenha,
  mensagemErroPedirCodigo,
  provouCodigoRecente,
  validarNovaSenha,
} from '@/lib/dominio/senha'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/**
 * Passos: `email` (pedir o código) → `codigo` (código + senha nova) → `senha` (o código já
 * foi aceito, só falta uma senha que o Auth aceite). `email` volta para a tela.
 */
export type EstadoRecuperar = {
  passo: 'email' | 'codigo' | 'senha'
  email?: string
  erro?: string
  /** Erro no campo da senha (fraca, vazada, repetida, confirmação diferente). */
  erroSenha?: string
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Conectado, o código vai sempre para o e-mail da própria conta (não se troca aqui). */
async function emailDaSessao() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims?.email
  return { supabase, email: typeof email === 'string' && email ? email : null }
}

export async function pedirCodigo(_: EstadoRecuperar, form: FormData): Promise<EstadoRecuperar> {
  const { supabase, email: daConta } = await emailDaSessao()
  const email =
    daConta ??
    String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
  if (!EMAIL.test(email)) return { passo: 'email', email, erro: 'Informe um e-mail válido.' }

  // O Auth responde igual exista ou não o login: a tela não revela quem tem acesso.
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) {
    // Registra só o código do erro, nunca o e-mail.
    console.error('Pedido de código falhou:', error.code ?? error.status)
    return { passo: 'email', email, erro: mensagemErroPedirCodigo(error) }
  }
  return { passo: 'codigo', email }
}

export async function salvarSenha(_: EstadoRecuperar, form: FormData): Promise<EstadoRecuperar> {
  const { supabase, email: daConta } = await emailDaSessao()
  const email =
    daConta ??
    String(form.get('email') ?? '')
      .trim()
      .toLowerCase()
  const codigo = limparCodigo(String(form.get('codigo') ?? ''))
  const senha = String(form.get('senha') ?? '')
  const confirmacao = String(form.get('confirmacao') ?? '')
  const passo = form.get('passo') === 'senha' ? 'senha' : 'codigo'

  const erroSenha = validarNovaSenha(senha, confirmacao)
  if (erroSenha) return { passo, email, erroSenha }

  if (passo === 'codigo') {
    if (codigo.length !== DIGITOS_CODIGO) {
      return { passo, email, erro: `O código tem ${DIGITOS_CODIGO} dígitos.` }
    }
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'recovery' })
    if (error) return { passo, email, erro: mensagemErroCodigo(error) }
  }

  // A prova de que leu o e-mail vem do token assinado pelo Auth, não da tela: chamar esta
  // ação direto, sem o código, não troca a senha de uma sessão aberta.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub || !provouCodigoRecente(claims.amr)) {
    return { passo: 'email', email, erro: 'O código venceu. Peça outro.' }
  }

  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) return { passo: 'senha', email, erroSenha: mensagemErroNovaSenha(error) }

  // Senha provisória do convite: a troca obrigatória fica cumprida.
  const appMetadata = claims.app_metadata as Record<string, unknown> | undefined
  if (appMetadata?.trocar_senha) {
    const { error: erroAdmin } = await criarClienteAdmin().auth.admin.updateUserById(claims.sub, {
      app_metadata: { trocar_senha: false },
    })
    const { error: erroSessao } = erroAdmin
      ? { error: erroAdmin }
      : await supabase.auth.refreshSession()
    if (erroSessao) {
      // O token antigo ainda diria "troca pendente": melhor entrar de novo com a senha nova.
      await supabase.auth.signOut()
      redirect('/login?senha=trocada')
    }
  }
  // Quem troca a senha por suspeita de invasão derruba as outras sessões.
  await supabase.auth.signOut({ scope: 'others' })
  redirect('/inicio')
}
