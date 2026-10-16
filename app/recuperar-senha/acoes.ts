'use server'

import { redirect } from 'next/navigation'
import {
  codigoCompleto,
  limparCodigo,
  mensagemErroCodigo,
  mensagemErroNovaSenha,
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

  // Sempre segue para o código, com ou sem erro: limite de envio (só acontece para quem tem
  // login) ou falha de e-mail revelariam quem tem acesso. Registra só o código do erro.
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) console.error('Pedido de código falhou:', error.code ?? error.status)
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
    if (!codigoCompleto(codigo)) {
      return { passo, email, erro: 'Digite o código que chegou no e-mail.' }
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

export type EstadoTrocarComSenha = { erro?: string; erroSenha?: string }

/**
 * Trocar a senha sem e-mail: pede a senha atual (conferida no Auth) antes da nova. Vale
 * enquanto o código por e-mail não chega para todos (`codigoPorEmail`). Salvar derruba os
 * outros aparelhos conectados.
 */
export async function trocarComSenhaAtual(
  _: EstadoTrocarComSenha,
  form: FormData,
): Promise<EstadoTrocarComSenha> {
  const { supabase, email } = await emailDaSessao()
  if (!email) redirect('/login')
  const atual = String(form.get('atual') ?? '')
  const senha = String(form.get('senha') ?? '')
  const confirmacao = String(form.get('confirmacao') ?? '')
  if (!atual) return { erro: 'Digite a senha que você usa hoje.' }
  const erroSenha = validarNovaSenha(senha, confirmacao)
  if (erroSenha) return { erroSenha }

  // Confere a senha atual (também conta como login recente para o Auth aceitar a troca).
  const { error: erroAtual } = await supabase.auth.signInWithPassword({ email, password: atual })
  if (erroAtual) {
    return {
      erro:
        erroAtual.status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
          : 'A senha atual não confere.',
    }
  }
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) return { erroSenha: mensagemErroNovaSenha(error) }
  await supabase.auth.signOut({ scope: 'others' })
  redirect('/inicio')
}
