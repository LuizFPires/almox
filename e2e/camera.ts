import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, devices, type Browser } from '@playwright/test'
import QRCode from 'qrcode'

const LARGURA = 640
const ALTURA = 480

/**
 * Vídeo Y4M (formato da câmera falsa do Chromium) mostrando um QR com `texto` no centro,
 * como o adesivo na frente do capacete. Devolve o caminho do arquivo.
 */
export function videoComQr(texto: string): string {
  // Como o adesivo: um segmento só de bytes.
  const { modules } = QRCode.create([{ data: new TextEncoder().encode(texto), mode: 'byte' }], {
    errorCorrectionLevel: 'M',
  })
  const modulo = 8
  const lado = (modules.size + 8) * modulo // 4 módulos de margem de cada lado
  const x0 = Math.floor((LARGURA - lado) / 2)
  const y0 = Math.floor((ALTURA - lado) / 2)
  const y = Buffer.alloc(LARGURA * ALTURA, 200) // fundo cinza claro (adesivo no capacete)
  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      const linha = Math.floor(py / modulo) - 4
      const coluna = Math.floor(px / modulo) - 4
      const dentro = linha >= 0 && coluna >= 0 && linha < modules.size && coluna < modules.size
      const escuro = dentro && modules.get(linha, coluna)
      y[(y0 + py) * LARGURA + x0 + px] = escuro ? 16 : 235
    }
  }
  const croma = Buffer.alloc((LARGURA / 2) * (ALTURA / 2), 128)
  const quadro = Buffer.concat([Buffer.from('FRAME\n'), y, croma, croma])
  const cabecalho = Buffer.from(`YUV4MPEG2 W${LARGURA} H${ALTURA} F15:1 Ip A1:1 C420jpeg\n`)
  const arquivo = join(
    tmpdir(),
    `almox-qr-${Date.now()}-${Math.random().toString(36).slice(2)}.y4m`,
  )
  writeFileSync(arquivo, Buffer.concat([cabecalho, quadro, quadro, quadro]))
  return arquivo
}

/** Chromium com a câmera falsa mostrando o QR (permissão de câmera já concedida). */
export async function navegadorComQr(texto: string): Promise<Browser> {
  return chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${videoComQr(texto)}`,
    ],
  })
}

export const CELULAR = devices['Pixel 7']
