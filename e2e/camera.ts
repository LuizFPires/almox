import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  chromium,
  devices,
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from '@playwright/test'
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
  // Teste com câmera falsa: a leitura do QR (até LEITURA_QR_MS) precisa caber no tempo do teste.
  test.slow()
  return chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${videoComQr(texto)}`,
    ],
  })
}

export const CELULAR = devices['Pixel 7']

/**
 * Espera pela leitura do QR na câmera falsa. A decodificação é quadro a quadro e depende de
 * CPU: no runner do CI (2 núcleos, outras suítes em paralelo) 15 s ficaram no limite.
 */
export const LEITURA_QR_MS = 30_000

/**
 * Espera a leitura do QR chegar em `alvo`. Se a consulta do capacete falhar no caminho
 * ("Não foi possível consultar"), lê de novo, como o almoxarife faria. Sem leitura no prazo,
 * anexa a tela do celular ao relatório (o navegador da câmera falsa não grava trace).
 */
export async function aguardarLeitura(pagina: Page, alvo: Locator): Promise<void> {
  const fim = Date.now() + LEITURA_QR_MS
  const falhou = pagina.getByText('Não foi possível consultar')
  while (Date.now() < fim) {
    if (await alvo.isVisible()) return
    if (await falhou.isVisible()) await pagina.getByRole('button', { name: 'Ler de novo' }).click()
    await pagina.waitForTimeout(250)
  }
  const tela = await pagina.screenshot({
    fullPage: true,
    path: test.info().outputPath('tela-sem-leitura.png'),
  })
  await test.info().attach('tela do celular sem leitura', { body: tela, contentType: 'image/png' })
  await expect(alvo).toBeVisible({ timeout: 1_000 })
}
