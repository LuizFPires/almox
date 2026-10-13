import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'

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
  const patch = async (caminho: string, data: unknown) => {
    const r = await request.patch(`${url}/rest/v1/${caminho}`, { headers, data })
    expect(r.ok(), await r.text()).toBeTruthy()
  }
  return { rpc, get, post, patch }
}

type Engenheiro = Awaited<ReturnType<typeof apiEngenheiro>>

/** Configuração do painel da obra (os testes da TV rodam em série e voltam ao padrão). */
const PADRAO = { tempo: 8, velocidade: 45, antes: 2500, depois: 3000, cartoes: 12 }
async function configurar(eng: Engenheiro, c: typeof PADRAO) {
  await eng.rpc('salvar_config_tv', {
    p_obra: OBRA,
    p_tempo_pagina_s: c.tempo,
    p_velocidade_px_s: c.velocidade,
    p_pausa_antes_ms: c.antes,
    p_pausa_depois_ms: c.depois,
    p_cartoes_por_pagina: c.cartoes,
  })
}

/** Mini PC novo da obra: devolve o id e o token do agente (que não abre o painel). */
async function criarMiniPc(eng: Engenheiro, nome: string) {
  const agente = await eng.rpc<string>('criar_dispositivo', { p_obra: OBRA, p_nome: nome })
  const [d] = await eng.get<{ id: string }[]>(
    `dispositivo_tv?select=id&nome=eq.${encodeURIComponent(nome)}&revogado_em=is.null`,
  )
  return { id: d?.id ?? '', agente }
}

/** Conecta esta página como a TV da obra: mini PC novo → código de uso único → /tv. */
async function conectarTv(page: Page, eng: Engenheiro, nome: string) {
  const miniPc = await criarMiniPc(eng, nome)
  const codigo = await eng.rpc<string>('gerar_codigo_tv', { p_dispositivo: miniPc.id })
  await page.goto(`/tv/entrar?c=${codigo}`)
  await expect(page).toHaveURL(/\/tv$/)
  return { ...miniPc, codigo }
}

test.describe('painel da TV', () => {
  test.skip(({ isMobile }) => isMobile, 'tela da TV')
  test.skip(semSeed, 'precisa do seed')
  test.describe.configure({ mode: 'serial' })

  test('engenheiro gera o código em Impressora e a TV conecta; o código vale uma vez', async ({
    page,
    browser,
    baseURL,
    request,
  }, info) => {
    const eng = await apiEngenheiro(request)
    const nome = `TV e2e ${info.project.name}-${Date.now() % 100000}`
    const miniPc = await criarMiniPc(eng, nome)

    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto('/cadastros/impressora')
    const cartao = page
      .locator('div')
      .filter({ hasText: nome })
      .filter({
        has: page.getByRole('button', { name: 'Conectar uma TV' }),
      })
    await cartao.last().getByRole('button', { name: 'Conectar uma TV' }).click()
    const endereco = page.getByLabel('Endereço para conectar a TV')
    await expect(endereco).toContainText('/tv/entrar?c=')
    // Só texto: um link tocado no celular conectaria o celular, não a TV.
    await expect(page.getByRole('link', { name: /tv\/entrar/ })).toHaveCount(0)
    const url = new URL((await endereco.textContent()) ?? '')

    const tv = await browser.newContext({ baseURL, viewport: { width: 1920, height: 1080 } })
    const outra = await browser.newContext({ baseURL, viewport: { width: 1920, height: 1080 } })
    try {
      const telaTv = await tv.newPage()
      await telaTv.goto('/tv')
      await expect(telaTv.getByText('Dispositivo não autorizado')).toBeVisible()
      await telaTv.goto(`${url.pathname}${url.search}`)
      await expect(telaTv).toHaveURL(/\/tv$/)
      await expect(telaTv.getByText('Obra Demonstração')).toBeVisible()

      // O mesmo código não serve uma segunda vez.
      const segunda = await outra.newPage()
      await segunda.goto(`${url.pathname}${url.search}`)
      await expect(segunda.getByText('Código vencido ou já usado')).toBeVisible()
      expect((await outra.cookies()).some((c) => c.name === 'almox_tv')).toBe(false)

      // Revogar o mini PC desliga a TV aberta no próximo ciclo.
      await eng.rpc('revogar_dispositivo', { p_dispositivo: miniPc.id })
      expect((await telaTv.request.get('/tv/dados')).status()).toBe(401)
      await expect(telaTv.getByText('Dispositivo não autorizado')).toBeVisible({ timeout: 6_000 })
    } finally {
      await tv.close()
      await outra.close()
    }
  })

  test('token do agente de impressão não abre o painel', async ({ page, request }, info) => {
    const eng = await apiEngenheiro(request)
    const { agente } = await criarMiniPc(eng, `Agente ${info.project.name}-${Date.now() % 100000}`)
    const { hostname } = new URL(page.url() === 'about:blank' ? 'http://localhost' : page.url())
    await page
      .context()
      .addCookies([{ name: 'almox_tv', value: agente, domain: hostname, path: '/tv' }])
    await page.goto('/tv')
    await expect(page.getByText('Dispositivo não autorizado')).toBeVisible()
    expect((await page.request.get('/tv/dados')).status()).toBe(401)
  })

  test('sem mudança, a TV recebe só a hora (sem os dados)', async ({ page, request }, info) => {
    const eng = await apiEngenheiro(request)
    await conectarTv(page, eng, `TV versão ${info.project.name}-${Date.now() % 100000}`)
    const completo = (await (await page.request.get('/tv/dados')).json()) as { versao: string }
    expect(completo.versao).toMatch(/^[0-9a-f]{32}$/)
    const igual = (await (
      await page.request.get(`/tv/dados?v=${completo.versao}`)
    ).json()) as object
    expect(Object.keys(igual)).toEqual(['agora'])
  })

  test('loop: páginas de 12 → colunas por empresa → volta à página 1', async ({
    page,
    request,
  }, info) => {
    // O ciclo inteiro (páginas + rolagem das colunas medidas) passa dos 30 s padrão.
    test.setTimeout(120_000)
    const eng = await apiEngenheiro(request)
    await configurar(eng, { tempo: 3, velocidade: 150, antes: 500, depois: 500, cartoes: 12 })
    try {
      await conectarTv(page, eng, `TV loop ${info.project.name}-${Date.now() % 100000}`)
      // O total vem da tela: os testes do celular mudam quem está com ferramenta enquanto isso.
      const primeira = page.getByText(/^Pessoas 1–\d+ de \d+ · ordem alfabética$/)
      await expect(primeira).toBeVisible()
      const n = Number((await primeira.textContent())?.match(/de (\d+)/)?.[1])
      expect(n).toBeGreaterThan(12)
      await expect(page.locator('article')).toHaveCount(12)
      // Segue as páginas que aparecerem (o total muda com os testes do celular rodando).
      const porEmpresa = page.getByRole('heading', { name: 'POR EMPRESA' })
      let pagina = 1
      while (!(await porEmpresa.isVisible()) && pagina < 10) {
        const proxima = page.getByText(new RegExp(`^Pessoas ${pagina * 12 + 1}–`))
        await expect(proxima.or(porEmpresa)).toBeVisible({ timeout: 6_000 })
        if (await proxima.isVisible()) pagina++
      }
      expect(pagina).toBeGreaterThanOrEqual(2)
      await expect(porEmpresa).toBeVisible()
      await expect(page.getByRole('region', { name: 'Construtora' })).toBeVisible()
      // Sem contagens na TV (só o nome da empresa).
      await expect(page.getByText(/\d+ (itens|pessoas)/)).toHaveCount(0)
      await expect(page.getByText(/^Pessoas 1–12 de/)).toBeVisible({ timeout: 90_000 })
    } finally {
      await configurar(eng, PADRAO)
    }
  })

  test('retirada feita no celular aparece na TV em até 3 s', async ({ page, request }, info) => {
    const eng = await apiEngenheiro(request)
    const sufixo = `${info.project.name}-${Date.now() % 100000}`
    // "Aaa…" fica no primeiro cartão da página 1 (ordem alfabética).
    const nome = `Aaa TV ${sufixo}`
    const [empresa] = await eng.get<{ id: string }[]>(
      `empresa?select=id&obra_id=eq.${OBRA}&tipo=eq.propria`,
    )
    const [pessoa] = await eng.post<{ id: string }[]>('pessoa?select=id', {
      obra_id: OBRA,
      empresa_id: empresa?.id,
      nome,
      nome_capacete: 'AAA',
      funcao: 'Servente',
    })
    const prefixo = Array.from({ length: 4 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join('')
    const [tipo] = await eng.post<{ id: string }[]>('tipo_ferramenta', {
      obra_id: OBRA,
      nome: `Trena ${sufixo}`,
      icone: 'regua',
      prefixo,
      valor_reposicao: 5000,
    })
    await eng.rpc('adicionar_unidades', { p_tipo: tipo?.id, p_quantidade: 1 })
    await configurar(eng, { ...PADRAO, tempo: 30 })
    let retirou = false
    try {
      await conectarTv(page, eng, `TV ao vivo ${sufixo}`)
      await expect(page.getByText(/Pessoas 1–12 de/)).toBeVisible()
      await expect(page.getByRole('article', { name: nome })).toHaveCount(0)

      await eng.rpc('registrar_retirada', {
        p_obra: OBRA,
        p_pessoa: pessoa?.id,
        p_identificacao: null,
        p_itens: [{ tipo: tipo?.id, quantidade: 1 }],
        p_confirmado: true,
      })
      retirou = true
      const inicio = Date.now()
      const cartao = page.getByRole('article', { name: nome })
      await expect(cartao).toBeVisible({ timeout: 3_000 })
      expect(Date.now() - inicio).toBeLessThanOrEqual(3_000)
      await expect(cartao).toContainText(`Trena ${sufixo}`)
      // A página não recomeçou do zero nem pulou: continua a 1.
      await expect(page.getByText(/Pessoas 1–12 de/)).toBeVisible()
    } finally {
      await configurar(eng, PADRAO)
      if (retirou) {
        await eng.rpc('registrar_devolucao', {
          p_obra: OBRA,
          p_pessoa: pessoa?.id,
          p_identificacao: null,
          p_itens: [{ tipo: tipo?.id, quantidade: 1 }],
        })
      }
      // Sem ferramenta e inativa: some da TV e das listas.
      await eng.patch(`pessoa?id=eq.${pessoa?.id}&select=id`, { ativa: false })
    }
  })

  test('sem conexão: mantém o último estado com aviso e volta sozinha', async ({
    page,
    request,
  }, info) => {
    const eng = await apiEngenheiro(request)
    await configurar(eng, { ...PADRAO, tempo: 30 })
    try {
      await conectarTv(page, eng, `TV queda ${info.project.name}-${Date.now() % 100000}`)
      await expect(page.locator('article').first()).toBeVisible()
      const cartoes = await page.locator('article').count()

      await page.route('**/tv/dados?**', (rota) => rota.abort('internetdisconnected'))
      await expect(page.getByRole('status')).toContainText(/Sem conexão desde \d{2}:\d{2}/, {
        timeout: 6_000,
      })
      await expect(page.locator('article')).toHaveCount(cartoes)

      await page.unroute('**/tv/dados?**')
      await expect(page.getByText(/Sem conexão desde/)).toHaveCount(0, { timeout: 6_000 })
    } finally {
      await configurar(eng, PADRAO)
    }
  })

  // Aqui, e não num spec do celular: salva na mesma obra que os testes acima (em série).
  test('Cadastros › Painel da TV: limites, salva e a TV usa', async ({ page, request }, info) => {
    const eng = await apiEngenheiro(request)
    try {
      await entrarComo(page, 'engenheiro', '/inicio')
      await page.goto('/cadastros/pessoas')
      await page.getByRole('button', { name: /^Impressora, TV e planilha/ }).click()
      await page.getByRole('link', { name: /Painel da TV/ }).click()
      await expect(page.getByRole('heading', { name: 'Painel da TV' })).toBeVisible()

      await page.getByLabel('Tempo por página (segundos)').fill('2')
      await page.getByRole('button', { name: 'Salvar' }).click()
      await expect(page.getByText('De 3 a 30 segundos.')).toBeVisible()

      await page.getByLabel('Tempo por página (segundos)').fill('20')
      await page.getByLabel('Pausa antes da rolagem (segundos)').fill('1,5')
      await page.getByText('16', { exact: true }).click()
      await page.getByRole('button', { name: 'Salvar' }).click()
      await expect(page.getByText('Configuração salva. A TV muda em até 2 segundos.')).toBeVisible()

      await conectarTv(page, eng, `TV config ${info.project.name}-${Date.now() % 100000}`)
      const dados = (await (await page.request.get('/tv/dados')).json()) as {
        config: { tempoPaginaS: number; pausaAntesMs: number; cartoesPorPagina: number }
      }
      expect(dados.config).toMatchObject({
        tempoPaginaS: 20,
        pausaAntesMs: 1500,
        cartoesPorPagina: 16,
      })
      await expect(page.getByText(/^Pessoas 1–16 de/)).toBeVisible()
    } finally {
      await configurar(eng, PADRAO)
    }
  })

  test('almoxarife não configura o painel', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/inicio')
    await page.goto('/cadastros/painel-tv')
    await expect(page.getByText('Só o engenheiro cadastra')).toBeVisible()
    await expect(page.getByLabel('Tempo por página (segundos)')).toHaveCount(0)
  })
})
