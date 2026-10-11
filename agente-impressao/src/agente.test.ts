import type { AddressInfo, Server } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { criarApi, ErroApi, type Api, type Trabalho } from './api.ts'
import { proximaEspera, rodarCiclo } from './ciclo.ts'
import { ErroConfig, lerConfig } from './config.ts'
import { descreverErroRede, enviarParaImpressora } from './impressora.ts'
import { iniciarSimulador, type Recebida } from './simulador.ts'

const TOKEN = 'a'.repeat(64)
const ENV = {
  ALMOX_SUPABASE_URL: 'https://xyz.supabase.co/',
  ALMOX_CHAVE_PUBLICA: 'sb_publishable_abc',
  ALMOX_TOKEN_DISPOSITIVO: TOKEN,
}

describe('configuração', () => {
  it('lê o .env com padrões de 2 s e 10 s', () => {
    expect(lerConfig(ENV)).toEqual({
      url: 'https://xyz.supabase.co',
      chavePublica: 'sb_publishable_abc',
      token: TOKEN,
      intervaloMs: 2000,
      timeoutImpressoraMs: 10_000,
    })
  })

  it('recusa chave secreta, token curto e URL faltando', () => {
    expect(() => lerConfig({ ...ENV, ALMOX_CHAVE_PUBLICA: 'sb_secret_x' })).toThrow(ErroConfig)
    expect(() => lerConfig({ ...ENV, ALMOX_TOKEN_DISPOSITIVO: 'abc' })).toThrow(ErroConfig)
    expect(() => lerConfig({ ...ENV, ALMOX_SUPABASE_URL: '' })).toThrow(ErroConfig)
    expect(() => lerConfig({ ...ENV, ALMOX_INTERVALO_MS: 'rápido' })).toThrow(ErroConfig)
  })

  it('a mensagem de erro nunca mostra o token', () => {
    try {
      lerConfig({ ...ENV, ALMOX_TOKEN_DISPOSITIVO: 'segredo-123' })
    } catch (erro) {
      expect(String(erro)).not.toContain('segredo-123')
    }
  })
})

describe('API do agente', () => {
  it('chama o /rpc com a chave pública e o token no corpo', async () => {
    const chamadas: { url: string; init: RequestInit }[] = []
    const api = criarApi(lerConfig(ENV), async (url, init) => {
      chamadas.push({ url: String(url), init: init ?? {} })
      return new Response('"Obra Demonstração"', { status: 200 })
    })
    await expect(api.ping()).resolves.toBe('Obra Demonstração')
    expect(chamadas[0]?.url).toBe('https://xyz.supabase.co/rest/v1/rpc/agente_ping')
    expect(chamadas[0]?.init.headers).toEqual({
      apikey: 'sb_publishable_abc',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(chamadas[0]?.init.body))).toEqual({ p_token: TOKEN })
  })

  it('token recusado vira erro "não autorizado"', async () => {
    const api = criarApi(lerConfig(ENV), async () =>
      Response.json({ code: '42501', message: 'Dispositivo não autorizado.' }, { status: 403 }),
    )
    const erro = await api.proximos().catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect((erro as ErroApi).naoAutorizado).toBe(true)
    expect((erro as ErroApi).message).toBe('Dispositivo não autorizado.')
  })

  it('sem internet: erro claro, sem derrubar o agente', async () => {
    const api = criarApi(lerConfig(ENV), async () => {
      throw new TypeError('fetch failed')
    })
    await expect(api.proximos()).rejects.toThrow('Sem conexão com o servidor do Almox.')
  })
})

describe('envio para a impressora (porta RAW)', () => {
  let servidor: Server | undefined
  afterEach(() => servidor?.close())

  it('entrega o ZPL inteiro para a impressora simulada', async () => {
    const recebidas: Recebida[] = []
    servidor = await iniciarSimulador(0, null, (r) => recebidas.push(r))
    const { port } = servidor.address() as AddressInfo
    const zpl = '^XA^CI28^FO95,24^BQN,2,10^FDMA,abc^FS^FDZÉ CARLOS^FS^XZ'
    await enviarParaImpressora('127.0.0.1', port, zpl, 2000)
    await expect.poll(() => recebidas.length).toBe(1)
    expect(recebidas[0]?.conteudo).toBe(zpl)
  })

  it('porta fechada: "recusou a conexão"', async () => {
    servidor = await iniciarSimulador(0, null)
    const { port } = servidor.address() as AddressInfo
    await new Promise((r) => servidor?.close(r))
    servidor = undefined
    await expect(enviarParaImpressora('127.0.0.1', port, '^XA^XZ', 2000)).rejects.toThrow(
      `recusou a conexão em 127.0.0.1:${port}`,
    )
  })

  it('mensagens de rede curtas', () => {
    expect(descreverErroRede({ code: 'TEMPO' }, '10.0.0.5', 9100)).toBe(
      'não respondeu em 10.0.0.5:9100 (desligada ou fora da rede?)',
    )
    expect(descreverErroRede({ code: 'EHOSTUNREACH' }, '10.0.0.5', 9100)).toBe(
      'não encontrada na rede (10.0.0.5:9100)',
    )
    expect(descreverErroRede(new Error('x'), '10.0.0.5', 9100)).toBe(
      'falha ao enviar para 10.0.0.5:9100',
    )
  })
})

function apiFalsa(trabalhos: Trabalho[]) {
  const concluidos: { id: string; ok: boolean; erro?: string }[] = []
  const api: Api = {
    ping: async () => 'Obra',
    proximos: async () => trabalhos,
    concluir: async (id, ok, erro) => {
      concluidos.push({ id, ok, erro })
    },
  }
  return { api, concluidos }
}

const trabalho = (id: string): Trabalho => ({
  id,
  payload: `^XA${id}^XZ`,
  ip: '10.0.0.5',
  porta: 9100,
  descricao: `Adesivo ${id}`,
})

describe('ciclo da fila', () => {
  it('envia em ordem e marca cada um como enviado', async () => {
    const { api, concluidos } = apiFalsa([trabalho('1'), trabalho('2')])
    const enviados: string[] = []
    const r = await rodarCiclo(
      api,
      async (_ip, _porta, p) => void enviados.push(p),
      () => {},
    )
    expect(r).toEqual({ enviados: 2, erros: 0 })
    expect(enviados).toEqual(['^XA1^XZ', '^XA2^XZ'])
    expect(concluidos).toEqual([
      { id: '1', ok: true, erro: undefined },
      { id: '2', ok: true, erro: undefined },
    ])
  })

  it('impressora sem resposta: marca erro com o motivo e segue para o próximo', async () => {
    const { api, concluidos } = apiFalsa([trabalho('1'), trabalho('2')])
    let vez = 0
    const r = await rodarCiclo(
      api,
      async () => {
        if (vez++ === 0) throw new Error('não respondeu em 10.0.0.5:9100')
      },
      () => {},
    )
    expect(r).toEqual({ enviados: 1, erros: 1 })
    expect(concluidos[0]).toEqual({ id: '1', ok: false, erro: 'não respondeu em 10.0.0.5:9100' })
    expect(concluidos[1]?.ok).toBe(true)
  })

  it('o log não leva payload (onde está o token do QR)', async () => {
    const { api } = apiFalsa([trabalho('1')])
    const linhas: string[] = []
    await rodarCiclo(
      api,
      async () => {},
      (l) => linhas.push(l),
    )
    expect(linhas.join('\n')).not.toContain('^XA')
  })

  it('espera 2 s normalmente, cresce até 30 s com falhas e 60 s com token recusado', () => {
    expect(proximaEspera(2000, 0, false)).toBe(2000)
    expect(proximaEspera(2000, 1, false)).toBe(4000)
    expect(proximaEspera(2000, 10, false)).toBe(30_000)
    expect(proximaEspera(2000, 1, true)).toBe(60_000)
  })
})
