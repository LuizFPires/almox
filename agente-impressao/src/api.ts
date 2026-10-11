import type { Config } from './config.ts'

/** Trabalho entregue pela fila (`agente_proximos`). O payload é ZPL ou TSPL pronto. */
export type Trabalho = {
  id: string
  payload: string
  ip: string
  porta: number
  descricao: string
}

export class ErroApi extends Error {
  readonly status: number
  /** Token revogado ou errado: não adianta insistir no mesmo ritmo. */
  readonly naoAutorizado: boolean

  constructor(mensagem: string, status: number, naoAutorizado: boolean) {
    super(mensagem)
    this.status = status
    this.naoAutorizado = naoAutorizado
  }
}

export type Api = {
  ping(): Promise<string>
  proximos(): Promise<Trabalho[]>
  concluir(trabalho: string, ok: boolean, erro?: string): Promise<void>
}

type Fetch = typeof fetch

/** Chama as três funções do agente no Supabase (PostgREST /rpc), só com a chave pública. */
export function criarApi(
  config: Pick<Config, 'url' | 'chavePublica' | 'token'>,
  f: Fetch = fetch,
): Api {
  async function rpc<T>(funcao: string, corpo: Record<string, unknown>): Promise<T> {
    let resposta: Response
    try {
      resposta = await f(`${config.url}/rest/v1/rpc/${funcao}`, {
        method: 'POST',
        headers: { apikey: config.chavePublica, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_token: config.token, ...corpo }),
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new ErroApi('Sem conexão com o servidor do Almox.', 0, false)
    }
    const texto = await resposta.text()
    if (!resposta.ok) {
      let mensagem = `Servidor respondeu ${resposta.status}.`
      let codigo = ''
      try {
        const erro = JSON.parse(texto) as { message?: string; code?: string }
        if (erro.message) mensagem = erro.message
        codigo = erro.code ?? ''
      } catch {
        // corpo não é JSON: fica a mensagem com o status
      }
      throw new ErroApi(mensagem, resposta.status, codigo === '42501')
    }
    return (texto ? JSON.parse(texto) : null) as T
  }

  return {
    ping: () => rpc<string>('agente_ping', {}),
    proximos: () => rpc<Trabalho[]>('agente_proximos', {}),
    concluir: (trabalho, ok, erro) =>
      rpc<null>('agente_concluir', { p_trabalho: trabalho, p_ok: ok, p_erro: erro ?? null }).then(
        () => undefined,
      ),
  }
}
