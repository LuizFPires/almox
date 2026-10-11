import { createConnection } from 'node:net'

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
