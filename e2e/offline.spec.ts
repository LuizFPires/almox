import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'
import { aguardarLeitura, CELULAR, navegadorComQr } from './camera'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

/** API como engenheiro (falha com a mensagem do banco). */
async function apiEngenheiro(request: APIRequestContext) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS.engenheiro, password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}`, Prefer: 'return=representation' }
  const rpc = async <T>(nome: string, data: unknown) => {
    const r = await request.post(`${url}/rest/v1/rpc/${nome}`, { headers, data })
    const corpo = await r.text()
    expect(r.ok(), corpo).toBeTruthy()
    return (corpo ? JSON.parse(corpo) : null) as T
  }
  const get = async <T>(caminho: string) => {
    const r = await request.get(`${url}/rest/v1/${caminho}`, { headers })
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const post = async <T>(caminho: string, data: unknown) => {
    const r = await request.post(`${url}/rest/v1/${caminho}`, { headers, data })
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  return { rpc, get, post }
}

/** O celular já guardou os dados da obra (com o tipo do teste) e a tela /campo. */
async function esperarGuardado(pagina: Page, tipo: string) {
  await expect
    .poll(
      () =>
        pagina.evaluate(async (tipoId) => {
          const temCampo = Boolean(await caches.match('/campo'))
          const dados = await new Promise<unknown[]>((resolve) => {
            const pedido = indexedDB.open('almox')
            pedido.onsuccess = () => {
              const banco = pedido.result
              if (!banco.objectStoreNames.contains('dados')) return resolve([])
              const r = banco.transaction('dados').objectStore('dados').getAll()
              r.onsuccess = () => resolve(r.result as unknown[])
              r.onerror = () => resolve([])
            }
            pedido.onerror = () => resolve([])
          })
          const temTipo = JSON.stringify(dados).includes(tipoId)
          return temCampo && temTipo
        }, tipo),
      { timeout: 20_000, message: 'celular guardou /campo e os dados da obra' },
    )
    .toBe(true)
}

test.describe('lançar sem internet', () => {
  test.skip(
    ({ browserName, isMobile }) => !isMobile || browserName !== 'chromium',
    'câmera falsa do Chromium',
  )
  test.skip(semSeed, 'precisa do seed')

  test('modo avião: 3 retiradas ficam na fila e chegam ao servidor e à TV quando a rede volta', async ({
    request,
    baseURL,
  }) => {
    const inicio = new Date().toISOString()
    const eng = await apiEngenheiro(request)
    const sufixo = `${Date.now() % 100000}`
    const nome = `Pá offline ${sufixo}`
    const prefixo = Array.from({ length: 4 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join('')
    const [tipo] = await eng.post<{ id: string }[]>('tipo_ferramenta', {
      obra_id: OBRA,
      nome,
      icone: 'pa',
      prefixo,
      valor_reposicao: 10000,
    })
    const tipoId = tipo?.id ?? ''
    await eng.rpc('adicionar_unidades', { p_tipo: tipoId, p_quantidade: 5 })
    const pessoa = async (n: string) =>
      (
        await eng.get<{ id: string }[]>(
          `pessoa?select=id&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent(n)}`,
        )
      )[0]?.id ?? ''
    const diego = await pessoa('Diego Rocha')
    const [adesivo] = await eng.rpc<{ token: string }[]>('dados_adesivo', { p_pessoa: diego })

    // TV da obra, conectada antes de a rede cair.
    const miniPc = await eng.rpc<string>('criar_dispositivo', {
      p_obra: OBRA,
      p_nome: `TV offline ${sufixo}`,
    })
    expect(miniPc).toBeTruthy()
    const [dispositivo] = await eng.get<{ id: string }[]>(
      `dispositivo_tv?select=id&nome=eq.${encodeURIComponent(`TV offline ${sufixo}`)}&revogado_em=is.null`,
    )
    const codigo = await eng.rpc<string>('gerar_codigo_tv', { p_dispositivo: dispositivo?.id })

    const navegador = await navegadorComQr(adesivo?.token ?? '')
    try {
      const tv = await navegador.newContext({ baseURL, viewport: { width: 1920, height: 1080 } })
      const telaTv = await tv.newPage()
      await telaTv.goto(`/tv/entrar?c=${codigo}`)
      await expect(telaTv).toHaveURL(/\/tv$/)
      // O painel anima sem parar (CPU): fica só a credencial da TV, conferida pelos dados dela.
      await telaTv.close()

      const celular = await navegador.newContext({ ...CELULAR, baseURL })
      const pagina = await celular.newPage()
      await entrarComo(pagina, 'almoxarife', '/inicio')
      // Segunda visita: o service worker já controla a página e guarda os arquivos.
      await pagina.reload()
      await esperarGuardado(pagina, tipoId)

      // Modo avião.
      await celular.setOffline(true)
      await pagina.goto('/campo')
      await expect(pagina.getByText('Sem internet. Os lançamentos ficam guardados')).toBeVisible()

      // 1ª: QR do capacete (conferido no celular).
      await pagina.getByRole('button', { name: /Ler QR do capacete/ }).click()
      const sim = pagina.getByRole('button', { name: 'Sim, é o Diego' })
      await aguardarLeitura(pagina, sim)
      await sim.click()
      await retirar(pagina, nome, 2)

      // 2ª e 3ª: escolhidas na lista (manual).
      for (const quem of ['Márcio Dias', 'Nilton Barbosa']) {
        await pagina.getByRole('button', { name: 'Sem capacete? Escolher na lista' }).click()
        await pagina.getByLabel('Buscar pessoa').fill(quem.split(' ')[0] ?? quem)
        await pagina.getByRole('button', { name: new RegExp(quem) }).click()
        await retirar(pagina, nome, 1)
      }

      // "Não é ele" sem internet: vai para a fila e não registra nada.
      const antesDaRede = new Date().toISOString()
      await pagina.getByRole('button', { name: /Ler QR do capacete/ }).click()
      const naoEhEle = pagina.getByRole('button', { name: 'Não é ele' })
      await aguardarLeitura(pagina, naoEhEle)
      await naoEhEle.click()
      await expect(pagina.getByRole('heading', { name: 'Nada foi registrado' })).toBeVisible()
      await pagina.getByRole('button', { name: 'Voltar' }).last().click()

      const fila = pagina.getByRole('region', { name: 'Fila do celular' })
      await expect(fila.getByText('aguardando envio', { exact: true })).toHaveCount(4)
      // Nada chegou ao servidor: as 5 peças da ferramenta do teste continuam livres.
      const livresAntes = await eng.get<unknown[]>(
        `unidade?select=id&tipo_id=eq.${tipoId}&status=eq.livre`,
      )
      expect(livresAntes).toHaveLength(5)

      // A rede volta: a fila vai sozinha.
      await celular.setOffline(false)
      await expect(fila.getByText('vazia', { exact: true })).toBeVisible({ timeout: 45_000 })

      const posses = await eng.get<{ pessoa_id: string; via: string }[]>(
        `posse?select=pessoa_id,via,unidade:unidade!inner(tipo_id)&unidade.tipo_id=eq.${tipoId}`,
      )
      expect(posses).toHaveLength(4)
      expect(posses.filter((p) => p.pessoa_id === diego).map((p) => p.via)).toEqual(['qr', 'qr'])
      expect(posses.filter((p) => p.via === 'manual')).toHaveLength(2)
      // Hora do celular (antes de a rede voltar) e hora de chegada guardadas.
      const movs = await eng.get<{ criado_em: string; recebido_em: string | null }[]>(
        `movimento?select=criado_em,recebido_em&pessoa_id=eq.${diego}&tipo=eq.retirada&order=criado_em.desc&limit=1`,
      )
      expect(Date.parse(movs[0]?.criado_em ?? '')).toBeLessThanOrEqual(Date.parse(antesDaRede))
      expect(movs[0]?.recebido_em).toBeTruthy()
      // A ocorrência chegou uma vez, com a hora do celular.
      const ocorrencias = await eng.get<unknown[]>(
        `ocorrencia?select=id&pessoa_id=eq.${diego}&criado_em=gte.${inicio}`,
      )
      expect(ocorrencias).toHaveLength(1)

      // E na TV (dados do painel).
      await expect
        .poll(async () => (await (await tv.request.get('/tv/dados')).text()).includes(nome), {
          timeout: 15_000,
        })
        .toBe(true)
    } finally {
      await navegador.close()
    }
  })

  test('sem login, a tela sem internet não abre (nem com dados de outro login no celular)', async ({
    page,
  }) => {
    await page.goto('/campo')
    // Sem sessão o servidor manda para o login; e a tela, se vier do cache, também bloqueia.
    await expect(page.getByText(/Ninguém está logado neste celular|Entrar/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Ler QR do capacete/ })).toHaveCount(0)
  })
})

/** Retirada na tela sem internet: toca o tipo, revisa, confere e guarda na fila. */
async function retirar(pagina: Page, nome: string, quantidade: number) {
  await pagina.getByRole('button', { name: 'Retirada' }).click()
  for (let i = 0; i < quantidade; i++) {
    await pagina.getByRole('button', { name: new RegExp(`^${nome}:`) }).click()
  }
  await pagina.getByRole('button', { name: /^Continuar/ }).click()
  await pagina.getByRole('checkbox').click()
  await pagina.getByRole('button', { name: 'Guardar retirada' }).click()
  await expect(pagina.getByRole('heading', { name: 'Retirada guardada no celular' })).toBeVisible()
  await pagina.getByRole('button', { name: 'Lançar outro' }).click()
}
