'use server'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { validarNovaSenha } from '@/lib/dominio/senha'
export async function cadastrar(_: { mensagem?: string }, form: FormData) {
  const senha = String(form.get('senha') ?? '')
  const erro = validarNovaSenha(senha, String(form.get('confirmacao') ?? ''))
  if (erro) return { mensagem: erro }
  const nome = String(form.get('nome') ?? '').trim()
  if (nome.length < 2 || nome.length > 120)
    return { mensagem: 'Informe seu nome (2 a 120 caracteres).' }
  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signUp({
    email: String(form.get('email') ?? '')
      .trim()
      .toLowerCase(),
    password: senha,
    options: {
      data: { nome },
      emailRedirectTo: 'https://almox-controle.vercel.app/auth/confirmar',
    },
  })
  return {
    mensagem: error
      ? 'Não foi possível criar a conta. Confira os dados e tente novamente.'
      : 'Confira seu e-mail para confirmar a conta. Depois entre no ALMOX para ver seus convites.',
  }
}
