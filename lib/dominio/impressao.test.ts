import { describe, expect, it } from 'vitest'
import { agenteOnline, descreverTrabalho, situacaoAgente, validarIp } from './impressao'

const agora = new Date('2026-10-11T12:00:00Z') // 09:00 em São Paulo

describe('situação do agente', () => {
  it('online se deu sinal nos últimos 30 s', () => {
    expect(agenteOnline('2026-10-11T11:59:45Z', agora)).toBe(true)
    expect(agenteOnline('2026-10-11T11:59:00Z', agora)).toBe(false)
    expect(agenteOnline(null, agora)).toBe(false)
  })

  it('usa o sinal mais recente entre os dispositivos', () => {
    expect(situacaoAgente([null, '2026-10-11T11:59:50Z', '2026-10-11T10:00:00Z'], agora)).toEqual({
      online: true,
      texto: 'Agente online',
    })
    expect(situacaoAgente(['2026-10-11T11:40:00Z'], agora)).toEqual({
      online: false,
      texto: 'Agente offline desde 08:40',
    })
    expect(situacaoAgente([], agora).online).toBe(false)
  })
})

describe('trabalho de impressão', () => {
  it('explica cada situação', () => {
    expect(descreverTrabalho('enviado', null, true)).toBe('Impresso no almoxarifado')
    expect(descreverTrabalho('pendente', null, false)).toContain(
      'agente de impressão está desligado',
    )
    expect(descreverTrabalho('erro', 'conexão recusada', true)).toBe(
      'Impressora sem resposta: conexão recusada',
    )
  })
})

describe('IP da impressora', () => {
  it('aceita IPv4 válido', () => {
    expect(validarIp('192.168.0.50')).toBeNull()
    expect(validarIp('192.168.0.256')).not.toBeNull()
    expect(validarIp('impressora.local')).not.toBeNull()
  })
})
