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
    const esperado = QRCode.create(dados.token, { errorCorrectionLevel: 'M' })
    const ligados = (caminho.match(/M/g) ?? []).length
    let total = 0
    for (let i = 0; i < esperado.modules.size ** 2; i++) total += esperado.modules.data[i] ? 1 : 0
    expect(ligados).toBe(total)
  })
})
