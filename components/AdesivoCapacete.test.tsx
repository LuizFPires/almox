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

  it('token que começa com dígitos continua legível pelo leitor do app (zxing)', async () => {
    const { BinaryBitmap, HybridBinarizer, PlanarYUVLuminanceSource, QRCodeReader } =
      await import('@zxing/library')
    // Este token falhava com o modo automático (segmento numérico + bytes).
    const token = '254859b71a71de7c990ca1c29d78d5b66121'
    const { container } = render(<AdesivoCapacete {...dados} token={token} />)
    const caminho = container.querySelector('svg path')?.getAttribute('d') ?? ''
    const tamanho = Number(/viewBox="0 0 (\d+)/.exec(container.innerHTML)?.[1])
    const escala = 8
    const lado = (tamanho + 8) * escala
    const luz = new Uint8ClampedArray(lado * lado).fill(235)
    for (const [, x, y] of caminho.matchAll(/M(\d+) (\d+)/g)) {
      for (let dy = 0; dy < escala; dy++) {
        for (let dx = 0; dx < escala; dx++) {
          luz[((Number(y) + 4) * escala + dy) * lado + (Number(x) + 4) * escala + dx] = 16
        }
      }
    }
    const fonte = new PlanarYUVLuminanceSource(luz, lado, lado, 0, 0, lado, lado, false)
    const lido = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(fonte)))
    expect(lido.getText()).toBe(token)
  })
})
