'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { destinoSeguro } from '@/lib/dominio/destino'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** `email` volta para o formulário: o React limpa os campos depois da ação. */
export type EstadoLogin = { erro?: string; aviso?: string; email?: string }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function lerEmail(form: FormData) {
  return String(form.get('email') ?? '')
    .trim()
    .toLowerCase()
}

export async function entrarComSenha(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = lerEmail(form)
  const senha = String(form.get('senha') ?? '')
  if (!EMAIL.test(email) || !senha) return { erro: 'Informe o e-mail e a senha.', email }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) return { erro: 'E-mail ou senha não conferem.', email }

  redirect(destinoSeguro(String(form.get('volta') ?? '')))
}

export async function enviarLinkMagico(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = lerEmail(form)
  if (!EMAIL.test(email)) return { erro: 'Informe um e-mail válido.', email }

  const origem = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const volta = destinoSeguro(String(form.get('volta') ?? ''))
  const supabase = await criarClienteServidor()
  // Só quem já foi convidado recebe link: não cria usuário novo.
  await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origem}/auth/confirmar?volta=${encodeURIComponent(volta)}`,
    },
  })
  // Mesma resposta exista ou não o e-mail, para não revelar quem tem login.
  return { aviso: 'Se este e-mail tiver acesso, o link de entrada chega em instantes.', email }
}

export async function sair() {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  redirect('/login')
}
