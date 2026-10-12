import 'server-only'
import type { Email } from './mensagens'

/**
 * Manda um e-mail. Produção: Resend (RESEND_API_KEY, remetente em EMAIL_REMETENTE, domínio da
 * construtora confirmado). Local e CI: caixa de teste do Supabase (Mailpit, MAILPIT_URL).
 * Sem nenhum dos dois, falha (o envio fica na fila para nova tentativa).
 */
export async function enviarEmail(para: string, email: Email, chave?: string): Promise<void> {
  const remetente = process.env.EMAIL_REMETENTE ?? 'Almox <avisos@almox.local>'
  if (process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        ...(chave ? { 'Idempotency-Key': chave } : {}),
      },
      body: JSON.stringify({
        from: remetente,
        to: [para],
        subject: email.assunto,
        html: email.html,
        text: email.texto,
      }),
    })
    // Sem o endereço na mensagem de erro (não vai e-mail para log).
    if (!r.ok) throw new Error(`Resend respondeu ${r.status}`)
    return
  }
  if (process.env.MAILPIT_URL) {
    const [, nome = 'Almox', endereco = 'avisos@almox.local'] =
      /^(.*?)\s*<([^>]+)>$/.exec(remetente) ?? []
    const r = await fetch(`${process.env.MAILPIT_URL}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: { Email: endereco, Name: nome },
        To: [{ Email: para }],
        Subject: email.assunto,
        HTML: email.html,
        Text: email.texto,
      }),
    })
    if (!r.ok) throw new Error(`caixa de teste respondeu ${r.status}`)
    return
  }
  throw new Error('envio de e-mail não configurado (RESEND_API_KEY)')
}
