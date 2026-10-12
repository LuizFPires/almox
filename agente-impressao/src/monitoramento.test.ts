import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { criarLog, envelope, lerDsn, limparLogsAntigos, mascarar } from './monitoramento.ts'

describe('logs do agente', () => {
  it('grava no arquivo do dia de São Paulo, com token mascarado', () => {
    const pasta = join(mkdtempSync(join(tmpdir(), 'almox-logs-')), 'logs')
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const log = criarLog(pasta)
    log(`token ${'a'.repeat(64)} recusado`, new Date('2026-10-13T01:00:00Z'))
    const arquivo = join(pasta, 'agente-2026-10-12.log')
    expect(existsSync(arquivo)).toBe(true)
    expect(readFileSync(arquivo, 'utf8')).toContain('token [token] recusado')
  })

  it('apaga só os logs com mais de 14 dias', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'almox-logs-'))
    for (const n of ['agente-2026-09-20.log', 'agente-2026-10-01.log', 'outro.txt']) {
      writeFileSync(join(pasta, n), 'x')
    }
    expect(limparLogsAntigos(pasta, new Date('2026-10-12T12:00:00Z'))).toEqual([
      'agente-2026-09-20.log',
    ])
    expect(readdirSync(pasta).sort()).toEqual(['agente-2026-10-01.log', 'outro.txt'])
  })
})

describe('Sentry do agente', () => {
  it('DSN válido vira endpoint de envelope; inválido desliga', () => {
    expect(lerDsn('https://abc123@o1.ingest.sentry.io/456')).toEqual({
      endpoint: 'https://o1.ingest.sentry.io/api/456/envelope/',
      chave: 'abc123',
      dsn: 'https://abc123@o1.ingest.sentry.io/456',
    })
    expect(lerDsn(undefined)).toBeNull()
    expect(lerDsn('http://abc@host/1')).toBeNull()
    expect(lerDsn('bobagem')).toBeNull()
  })

  it('envelope sem dado pessoal', () => {
    const dsn = lerDsn('https://abc123@o1.ingest.sentry.io/456')!
    const [, tipo, evento] = envelope(dsn, 'falhou para dono@formas.com').split('\n')
    expect(JSON.parse(tipo ?? '{}')).toEqual({ type: 'event' })
    expect(JSON.parse(evento ?? '{}').message.formatted).toBe('falhou para [e-mail]')
  })

  it('mascarar', () => {
    expect(mascarar('eyJa.eyJb.c')).toBe('[jwt]')
  })
})
