'use server'

import { redirect } from 'next/navigation'
import { destinoSeguro } from '@/lib/dominio/destino'
import { mensagemErroLogin } from '@/lib/dominio/senha'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** `email` volta para o formulário: o React limpa os campos depois da ação. */
export type EstadoLogin = { erro?: string; email?: string }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function entrarComSenha(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase()
  const senha = String(form.get('senha') ?? '')
  if (!EMAIL.test(email) || !senha) return { erro: 'Informe o e-mail e a senha.', email }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) return { erro: mensagemErroLogin(error), email }

  redirect(destinoSeguro(String(form.get('volta') ?? '')))
}

export async function sair() {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  redirect('/login')
}
