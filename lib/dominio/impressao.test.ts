import { describe, expect, it } from 'vitest'
import {
  agenteOnline,
  descreverTrabalho,
  emAndamento,
  lerCopias,
  situacaoAgente,
  validarIp,
  validarPorta,
} from './impressao'

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
    expect(situacaoAgente(['2026-10-09T20:15:00Z'], agora)).toEqual({
      online: false,
      texto: 'Agente offline desde 09/10/2026 17:15',
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

  it('só aceita IP da rede local (nunca da internet)', () => {
    for (const ip of ['10.0.0.5', '172.16.1.2', '172.31.255.1', '127.0.0.1']) {
      expect(validarIp(ip)).toBeNull()
    }
    for (const ip of ['8.8.8.8', '172.32.0.1', '192.169.0.1', '200.10.1.1']) {
      expect(validarIp(ip)).not.toBeNull()
    }
  })

  it('porta RAW de 9100 a 9199', () => {
    expect(validarPorta(9100)).toBeNull()
    expect(validarPorta(9101)).toBeNull()
    expect(validarPorta(25)).not.toBeNull()
    expect(validarPorta(9200)).not.toBeNull()
  })
})

describe('cópias do adesivo', () => {
  it('aceita de 1 a 5', () => {
    expect(lerCopias('1')).toBe(1)
    expect(lerCopias(' 5 ')).toBe(5)
  })

  it('recusa zero, mais de 5, fração e texto', () => {
    for (const v of ['0', '6', '10', '2.5', '', 'dois', '-1']) expect(lerCopias(v)).toBeNull()
  })

  it('pendente e enviando ainda estão em andamento', () => {
    expect(emAndamento('pendente')).toBe(true)
    expect(emAndamento('enviando')).toBe(true)
    expect(emAndamento('enviado')).toBe(false)
    expect(emAndamento('erro')).toBe(false)
  })
})
