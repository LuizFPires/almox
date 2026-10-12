/** Serviços de notificação dos navegadores (Chrome/Android, Firefox, Safari/iPhone, Edge). */
const SERVICOS_PUSH = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  '.push.apple.com',
  '.notify.windows.com',
]

/**
 * O endereço de notificação só pode ser de um serviço de push conhecido, em https, sem
 * usuário/senha: o servidor faz POST nele, então um endereço qualquer viraria SSRF.
 */
export function endpointPushValido(endpoint: string): boolean {
  if (endpoint.length > 1000) return false
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  return SERVICOS_PUSH.some((s) => (s.startsWith('.') ? host.endsWith(s) : host === s))
}
