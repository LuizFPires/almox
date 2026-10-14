/** Configuração do agente, lida do `.env` do mini PC (nunca vai para o log). */
export type Config = {
  /** URL do projeto Supabase (ex.: https://xyz.supabase.co). */
  url: string
  /** Chave pública (sb_publishable_…): o agente não faz login. */
  chavePublica: string
  /** Token do dispositivo, mostrado uma vez na tela Impressora. */
  token: string
  /** Intervalo entre consultas à fila (PLAN › Decisões: 2 s). */
  intervaloMs: number
  /** Quanto esperar a impressora responder antes de dar erro. */
  timeoutImpressoraMs: number
}

export class ErroConfig extends Error {}

function numero(valor: string | undefined, padrao: number, nome: string): number {
  if (valor === undefined || valor.trim() === '') return padrao
  const n = Number(valor)
  if (!Number.isInteger(n) || n < 100) throw new ErroConfig(`${nome} inválido: use milissegundos.`)
  return n
}

export function lerConfig(env: Record<string, string | undefined>): Config {
  const url = (env.ALMOX_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const chavePublica = (env.ALMOX_CHAVE_PUBLICA ?? '').trim()
  const token = (env.ALMOX_TOKEN_DISPOSITIVO ?? '').trim()

  if (!/^https?:\/\/[^\s/]+/.test(url)) {
    throw new ErroConfig('ALMOX_SUPABASE_URL ausente ou inválida (copie da tela Impressora).')
  }
  // O token do mini PC só viaja cifrado; http só para o Supabase local (simulador).
  if (!url.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) {
    throw new ErroConfig('ALMOX_SUPABASE_URL precisa começar com https://.')
  }
  if (!chavePublica) throw new ErroConfig('ALMOX_CHAVE_PUBLICA ausente (copie da tela Impressora).')
  if (chavePublica.startsWith('sb_secret_')) {
    throw new ErroConfig('ALMOX_CHAVE_PUBLICA é uma chave secreta. Use a chave pública.')
  }
  if (!/^[0-9a-f]{64}$/.test(token)) {
    throw new ErroConfig(
      'ALMOX_TOKEN_DISPOSITIVO ausente ou inválido. Cadastre o mini PC na tela Impressora.',
    )
  }

  return {
    url,
    chavePublica,
    token,
    intervaloMs: numero(env.ALMOX_INTERVALO_MS, 2000, 'ALMOX_INTERVALO_MS'),
    timeoutImpressoraMs: numero(
      env.ALMOX_TIMEOUT_IMPRESSORA_MS,
      10_000,
      'ALMOX_TIMEOUT_IMPRESSORA_MS',
    ),
  }
}
