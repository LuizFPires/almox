import 'server-only'
import webpush from 'web-push'
import type { Notificacao } from './mensagens'

export type Inscricao = { endpoint: string; p256dh: string; auth: string }

/** Chave pública VAPID (vai para o navegador assinar a inscrição). */
export function chavePublicaVapid(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null
}

/**
 * Manda a notificação para cada aparelho inscrito. Devolve os endpoints que o serviço recusou
 * de vez (404/410: o aparelho saiu), para tirar da lista. Erro passageiro sobe (nova tentativa).
 */
export async function enviarPush(
  inscricoes: Inscricao[],
  n: Notificacao,
): Promise<{ removidas: string[] }> {
  if (inscricoes.length === 0) return { removidas: [] }
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  const assunto = process.env.VAPID_SUBJECT
  if (!publica || !privada || !assunto) throw new Error('notificação não configurada (VAPID)')

  const carga = JSON.stringify({ titulo: n.titulo, corpo: n.corpo, url: n.url })
  const removidas: string[] = []
  let falhou = false
  for (const i of inscricoes) {
    try {
      await webpush.sendNotification(
        { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
        carga,
        {
          vapidDetails: { subject: assunto, publicKey: publica, privateKey: privada },
          TTL: 86_400,
        },
      )
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) removidas.push(i.endpoint)
      else falhou = true
    }
  }
  if (falhou) throw new Error('serviço de notificação falhou')
  return { removidas }
}
