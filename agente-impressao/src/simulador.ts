/**
 * Impressora simulada: escuta na porta RAW (padrão 9101) e grava cada etiqueta recebida
 * em `etiquetas-recebidas/`. Serve para testar o agente sem a impressora de verdade.
 *
 *   node src/simulador.ts [porta]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type Recebida = { conteudo: string; arquivo: string | null }

/** Sobe a impressora simulada. `pasta` null = só guarda em memória (testes). */
export function iniciarSimulador(
  porta: number,
  pasta: string | null,
  aoReceber?: (r: Recebida) => void,
): Promise<Server> {
  if (pasta) mkdirSync(pasta, { recursive: true })
  let contador = 0
  const servidor = createServer((socket) => {
    const partes: Buffer[] = []
    socket.on('data', (d) => partes.push(d))
    socket.on('end', () => {
      const conteudo = Buffer.concat(partes).toString('utf8')
      contador++
      const extensao = conteudo.startsWith('^XA') ? 'zpl' : 'tspl'
      const arquivo = pasta
        ? join(pasta, `${new Date().toISOString().replace(/[:.]/g, '-')}-${contador}.${extensao}`)
        : null
      if (arquivo) writeFileSync(arquivo, conteudo)
      aoReceber?.({ conteudo, arquivo })
      socket.end()
    })
    socket.on('error', () => socket.destroy())
  })
  return new Promise((resolver, rejeitar) => {
    servidor.once('error', rejeitar)
    servidor.listen(porta, '127.0.0.1', () => resolver(servidor))
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const porta = Number(process.argv[2] ?? 9101)
  const pasta = join(dirname(fileURLToPath(import.meta.url)), '..', 'etiquetas-recebidas')
  await iniciarSimulador(porta, pasta, ({ conteudo, arquivo }) => {
    const qr = /\^FDMA,([^^]*)\^FS|QRCODE [^"]*"([^"]*)"/.exec(conteudo)
    console.log(`Etiqueta recebida (${conteudo.length} bytes) → ${arquivo}`)
    if (qr) console.log(`  QR: ${qr[1] ?? qr[2]}`)
  })
  console.log(`Impressora simulada em 127.0.0.1:${porta}. Etiquetas em ${pasta}`)
}
