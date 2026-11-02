'use server'

import { codigoPorEmail } from '@/lib/configuracao'
import { lerNovaConta } from '@/lib/dominio/conta'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/servidor'

/** `dados` (nome e e-mail) → `codigo` (o passo do código e da senha é o mesmo de Esqueci a senha). */
export type EstadoCriarConta = {
  passo: 'dados' | 'codigo'
  nome?: string
  email?: string
  campos?: Partial<Record<'nome' | 'email', string>>
  erro?: string
}

/**
 * Cria o login sem obra e manda o código para o e-mail. A conta só vale depois que a pessoa
 * digita o código e escolhe a senha (o Auth confirma o e-mail nesse momento). Se o e-mail já
 * tem login, só manda o código: a resposta é a mesma, para não dizer quem tem conta.
 */
export async function criarConta(_: EstadoCriarConta, form: FormData): Promise<EstadoCriarConta> {
  const nomeDigitado = String(form.get('nome') ?? '')
  const emailDigitado = String(form.get('email') ?? '')
  const lido = lerNovaConta(nomeDigitado, emailDigitado)
  if ('campos' in lido) {
    return { passo: 'dados', nome: nomeDigitado, email: emailDigitado, campos: lido.campos }
  }
  const { nome, email } = lido
  if (!codigoPorEmail()) {
    return {
      passo: 'dados',
      nome,
      email,
      erro: 'Criar conta por aqui está desligado. Peça ao engenheiro.',
    }
  }

  const admin = criarClienteAdmin()
  const { data: existente, error: erroBusca } = await admin
    .from('usuario')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (erroBusca) return { passo: 'dados', nome, email, erro: 'Não deu certo. Tente de novo.' }
  if (!existente) {
    // Sem senha e sem e-mail confirmado: o código que ela digitar confirma os dois. Conta que não
    // confirma em 24 h é apagada pelo banco.
    const { error } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { nome },
    })
    if (error && error.code !== 'email_exists') {
      console.error('Criar conta falhou:', error.code ?? error.status)
      return { passo: 'dados', nome, email, erro: 'Não deu certo. Tente de novo.' }
    }
  }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  // Limite de envio ou falha do e-mail: segue para o código mesmo assim ("Reenviar" resolve).
  if (error) console.error('Código da conta nova falhou:', error.code ?? error.status)
  return { passo: 'codigo', nome, email }
}
