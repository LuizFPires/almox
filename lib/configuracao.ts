import 'server-only'

/**
 * O Supabase entrega o código de senha por e-mail para qualquer pessoa? Só com e-mail próprio
 * (SMTP/Resend) configurado no Auth; sem ele, só chega para os membros da organização no
 * Supabase. Produção: ligue `CODIGO_POR_EMAIL=1` na Vercel depois de configurar o SMTP. Local e
 * CI: a caixa de teste (Mailpit) recebe tudo.
 */
export function codigoPorEmail(): boolean {
  return process.env.CODIGO_POR_EMAIL === '1' || Boolean(process.env.MAILPIT_URL)
}
