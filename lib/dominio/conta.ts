import { validarEmail } from './cadastros'

export type NovaConta = { nome: string; email: string }
export type ErrosNovaConta = { campos: Partial<Record<'nome' | 'email', string>> }

/**
 * Criar conta (tela pública): nome e e-mail. A conta nasce sem obra; o engenheiro vincula depois
 * em Cadastros › Acessos. A prova de que o e-mail é da pessoa é o código que ela digita em seguida.
 */
export function lerNovaConta(nome: string, email: string): NovaConta | ErrosNovaConta {
  const nomeLimpo = nome.replace(/\s+/g, ' ').trim()
  const emailLimpo = email.trim().toLowerCase()
  const campos: ErrosNovaConta['campos'] = {}
  if (nomeLimpo.length < 2) campos.nome = 'Informe o seu nome.'
  else if (nomeLimpo.length > 120) campos.nome = 'Use até 120 caracteres.'
  const erroEmail = validarEmail(emailLimpo, true)
  if (erroEmail) campos.email = erroEmail
  if (Object.keys(campos).length > 0) return { campos }
  return { nome: nomeLimpo, email: emailLimpo }
}
