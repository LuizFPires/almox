// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import QRCode from 'qrcode'
import { afterEach, describe, expect, it } from 'vitest'
import { AdesivoCapacete } from './AdesivoCapacete'

afterEach(cleanup)

const dados = {
  token: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012ab',
  nomeCapacete: 'ZÉ CARLOS',
  nomeCompleto: 'José Carlos Teixeira',
  funcao: 'Carpinteiro',
  empresa: 'Fôrmas Ribeiro',
  obra: 'SL Betim',
  matricula: 'P-0013',
}

describe('prévia do adesivo', () => {
  it('mostra capacete, nome, função · empresa e rodapé', () => {
    render(<AdesivoCapacete {...dados} />)
    expect(screen.getByText('ZÉ CARLOS')).toBeDefined()
    expect(screen.getByText('José Carlos Teixeira')).toBeDefined()
    expect(screen.getByText('Carpinteiro · Fôrmas Ribeiro')).toBeDefined()
    expect(screen.getByText('ALMOX · SL Betim')).toBeDefined()
    expect(screen.getByText('P-0013')).toBeDefined()
  })

  it('o QR desenhado é o do token (e só dele)', () => {
    const { container } = render(<AdesivoCapacete {...dados} />)
    const caminho = container.querySelector('svg path')?.getAttribute('d') ?? ''
    const esperado = QRCode.create(
      [{ data: new TextEncoder().encode(dados.token), mode: 'byte' }],
      {
        errorCorrectionLevel: 'M',
      },
    )
    const ligados = (caminho.match(/M/g) ?? []).length
    let total = 0
    for (let i = 0; i < esperado.modules.size ** 2; i++) total += esperado.modules.data[i] ? 1 : 0
    expect(ligados).toBe(total)
  })

  it('token que começa com dígitos continua legível pelo leitor do app (jsQR)', async () => {
    const { default: jsQR } = await import('jsqr')
    // Este token falhava com o modo automático (segmento numérico + bytes).
    const token = '254859b71a71de7c990ca1c29d78d5b66121'
    const { container } = render(<AdesivoCapacete {...dados} token={token} />)
    const caminho = container.querySelector('svg path')?.getAttribute('d') ?? ''
    const tamanho = Number(/viewBox="0 0 (\d+)/.exec(container.innerHTML)?.[1])
    const ligados = new Set([...caminho.matchAll(/M(\d+) (\d+)/g)].map(([, x, y]) => `${y},${x}`))
    const { dados: imagem, lado } = imagemDoQr(tamanho, (l, c) => ligados.has(`${l},${c}`))
    expect(jsQR(imagem, lado, lado)?.data).toBe(token)
  })

  it('o leitor do app lê qualquer token do capacete (100 aleatórios)', async () => {
    // O zxing-js deixava de ler ~7% dos códigos (M10); o leitor tem que ler todos.
    const { default: jsQR } = await import('jsqr')
    const falhas: string[] = []
    for (let n = 0; n < 100; n++) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('')
      const qr = QRCode.create([{ data: new TextEncoder().encode(token), mode: 'byte' }], {
        errorCorrectionLevel: 'M',
      })
      const { dados: imagem, lado } = imagemDoQr(qr.modules.size, (l, c) =>
        Boolean(qr.modules.get(l, c)),
      )
      if (jsQR(imagem, lado, lado)?.data !== token) falhas.push(token)
    }
    expect(falhas).toEqual([])
  }, 20_000)
})

/** Imagem RGBA do QR (8 px por módulo, 4 módulos de margem), como a câmera veria o adesivo. */
function imagemDoQr(tamanho: number, ligado: (linha: number, coluna: number) => boolean) {
  const escala = 8
  const lado = (tamanho + 8) * escala
  const dados = new Uint8ClampedArray(lado * lado * 4)
  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      const l = Math.floor(py / escala) - 4
      const c = Math.floor(px / escala) - 4
      const escuro = l >= 0 && c >= 0 && l < tamanho && c < tamanho && ligado(l, c)
      const i = (py * lado + px) * 4
      dados[i] = dados[i + 1] = dados[i + 2] = escuro ? 16 : 235
      dados[i + 3] = 255
    }
  }
  return { dados, lado }
}
