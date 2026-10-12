/**
 * Logs do agente (M10): cada linha vai para a tela e para `logs/agente-AAAA-MM-DD.log`, com 14
 * dias guardados. Problemas também vão para o Sentry quando SENTRY_DSN está no `.env` (sem dado
 * pessoal: e-mail, token e JWT mascarados). Só conexões de saída, como o resto do agente.
 */
import { appendFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { hostname } from 'node:os'
import { join } from 'node:path'

const DIAS_GUARDADOS = 14

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const HEX_LONGO = /\b[0-9a-f]{16,}\b/gi
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g

export function mascarar(texto: string): string {
  return texto.replace(JWT, '[jwt]').replace(EMAIL, '[e-mail]').replace(HEX_LONGO, '[token]')
}

function diaDeSaoPaulo(agora: Date): string {
  return agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/** Apaga logs com mais de 14 dias (nome agente-AAAA-MM-DD.log). */
export function limparLogsAntigos(pasta: string, agora = new Date()): string[] {
  const limite = diaDeSaoPaulo(new Date(agora.getTime() - DIAS_GUARDADOS * 86_400_000))
  const apagados: string[] = []
  let nomes: string[] = []
  try {
    nomes = readdirSync(pasta)
  } catch {
    return apagados
  }
  for (const nome of nomes) {
    const dia = /^agente-(\d{4}-\d{2}-\d{2})\.log$/.exec(nome)?.[1]
    if (dia && dia < limite) {
      rmSync(join(pasta, nome), { force: true })
      apagados.push(nome)
    }
  }
  return apagados
}

/** Registra uma linha na tela e no arquivo do dia (São Paulo). Falha no disco não derruba. */
export function criarLog(pasta: string) {
  let diaAtual = ''
  return (mensagem: string, agora = new Date()) => {
    const hora = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const linha = `[${hora}] ${mascarar(mensagem)}`
    console.log(linha)
    try {
      const dia = diaDeSaoPaulo(agora)
      if (dia !== diaAtual) {
        mkdirSync(pasta, { recursive: true })
        limparLogsAntigos(pasta, agora)
        diaAtual = dia
      }
      appendFileSync(join(pasta, `agente-${dia}.log`), `${linha}\n`)
    } catch {
      // disco cheio ou sem permissão: segue só na tela
    }
  }
}

type Dsn = { endpoint: string; chave: string; dsn: string }

/** https://chave@o1.ingest.sentry.io/123 → endpoint de envelope e chave. Inválido: null. */
export function lerDsn(texto: string | undefined): Dsn | null {
  if (!texto?.trim()) return null
  try {
    const u = new URL(texto.trim())
    const projeto = u.pathname.replace(/^\/+|\/+$/g, '')
    if (u.protocol !== 'https:' || !u.username || !/^\d+$/.test(projeto)) return null
    return {
      endpoint: `https://${u.host}/api/${projeto}/envelope/`,
      chave: u.username,
      dsn: texto.trim(),
    }
  } catch {
    return null
  }
}

/** Monta o envelope do Sentry para uma mensagem de erro do agente. */
export function envelope(dsn: Dsn, mensagem: string, agora = new Date()) {
  const id = crypto.randomUUID().replaceAll('-', '')
  const evento = {
    event_id: id,
    timestamp: agora.getTime() / 1000,
    platform: 'node',
    level: 'error',
    logger: 'agente-impressao',
    // Nome do mini PC sem dado pessoal (pode ser "TV-ALMOX"); serve para saber qual obra.
    server_name: mascarar(hostname()),
    release: 'almox-agente-impressao@0.1.0',
    message: { formatted: mascarar(mensagem) },
  }
  return [
    JSON.stringify({ event_id: id, sent_at: agora.toISOString(), dsn: dsn.dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(evento),
  ].join('\n')
}

/** Manda um problema ao Sentry (se configurado). Nunca lança: monitoramento não para o agente. */
export function criarAlerta(texto: string | undefined) {
  const dsn = lerDsn(texto)
  return async (mensagem: string) => {
    if (!dsn) return
    try {
      await fetch(dsn.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.chave}, sentry_client=almox-agente/0.1.0`,
        },
        body: envelope(dsn, mensagem),
        signal: AbortSignal.timeout(10_000),
      })
    } catch {
      // sem internet: o problema fica no log local
    }
  }
}
