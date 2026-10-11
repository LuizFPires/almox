'use server'

import { redirect } from 'next/navigation'
import { validarNovaSenha } from '@/lib/dominio/senha'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export type EstadoSenha = { erro?: string }

export async function trocarSenha(_: EstadoSenha, form: FormData): Promise<EstadoSenha> {
  const senha = String(form.get('senha') ?? '')
  const confirmacao = String(form.get('confirmacao') ?? '')
  const erro = validarNovaSenha(senha, confirmacao)
  if (erro) return { erro }

  const supabase = await criarClienteServidor()
  const { data: claims } = await supabase.auth.getClaims()
  const id = claims?.claims?.sub
  if (!id) redirect('/login')

  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) {
    return {
      erro:
        error.code === 'same_password'
          ? 'Use uma senha diferente da provisória.'
          : error.code === 'weak_password'
            ? 'Senha fraca. Misture letras, números e símbolos.'
            : 'Não foi possível trocar a senha. Tente de novo.',
    }
  }

  // Tira a marca de troca obrigatória (app_metadata só o administrador altera) e
  // renova a sessão para o token novo já vir sem ela.
  const appMetadata = claims.claims.app_metadata as Record<string, unknown> | undefined
  if (appMetadata?.trocar_senha) {
    const { error: erroAdmin } = await criarClienteAdmin().auth.admin.updateUserById(id, {
      app_metadata: { trocar_senha: false },
    })
    if (erroAdmin) return { erro: 'Senha trocada, mas não foi possível concluir. Entre de novo.' }
    const { error: erroSessao } = await supabase.auth.refreshSession()
    if (erroSessao) {
      // O token antigo ainda diria "troca pendente": melhor entrar de novo com a senha nova.
      await supabase.auth.signOut()
      redirect('/login?senha=trocada')
    }
  }
  redirect('/inicio')
}
