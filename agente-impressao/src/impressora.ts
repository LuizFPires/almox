import { createConnection } from 'node:net'

/**
 * Só a rede da obra (10.x, 172.16-31.x, 192.168.x, ou 127.x = o próprio mini PC) e a porta
 * RAW 9100-9199. O banco já exige isso; o agente confere de novo antes de conectar.
 */
export function destinoPermitido(ip: string, porta: number): boolean {
  const partes = ip.split('.')
  if (partes.length !== 4 || !partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) {
    return false
  }
  const [a, b] = partes.map(Number) as [number, number]
  const local =
    a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  return local && Number.isInteger(porta) && porta >= 9100 && porta <= 9199
}

/** Mensagem curta para a tela (o almoxarife lê "Impressora sem resposta: …"). */
export function descreverErroRede(erro: unknown, ip: string, porta: number): string {
  const codigo = (erro as { code?: string } | null)?.code
  const alvo = `${ip}:${porta}`
  switch (codigo) {
    case 'ETIMEDOUT':
    case 'TEMPO':
      return `não respondeu em ${alvo} (desligada ou fora da rede?)`
    case 'ECONNREFUSED':
      return `recusou a conexão em ${alvo} (porta errada?)`
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
      return `não encontrada na rede (${alvo})`
    case 'ECONNRESET':
    case 'EPIPE':
      return `cortou a conexão no meio (${alvo})`
    default:
      return `falha ao enviar para ${alvo}`
  }
}

/**
 * Manda o ZPL/TSPL cru para a porta 9100 (RAW) da impressora, só conexão de saída na rede
 * da obra. Resolve quando a impressora fecha ou aceita o fim do envio.
 */
export function enviarParaImpressora(
  ip: string,
  porta: number,
  payload: string,
  timeoutMs: number,
): Promise<void> {
  if (!destinoPermitido(ip, porta)) {
    return Promise.reject(new Error(`fora da rede da obra (${ip}:${porta}); envio bloqueado`))
  }
  return new Promise((resolver, rejeitar) => {
    let terminado = false
    const socket = createConnection({ host: ip, port: porta })
    const acabar = (erro?: unknown) => {
      if (terminado) return
      terminado = true
      clearTimeout(relogio)
      socket.destroy()
      if (erro) rejeitar(new Error(descreverErroRede(erro, ip, porta)))
      else resolver()
    }
    const relogio = setTimeout(() => acabar({ code: 'TEMPO' }), timeoutMs)
    socket.once('error', (erro) => acabar(erro))
    socket.once('connect', () => {
      socket.end(Buffer.from(payload, 'utf8'), () => acabar())
    })
  })
}
