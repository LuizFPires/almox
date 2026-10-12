import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ambiente, SENHA_SEED, semSeed, USUARIOS } from './apoio'

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

/** Conecta esta página como a TV da obra (dispositivo novo). */
async function conectarTv(page: Page, eng: Engenheiro, nome: string) {
  const token = await eng.rpc<string>('criar_dispositivo', { p_obra: OBRA, p_nome: nome })
  await page.goto(`/tv/entrar?t=${token}`)
  await expect(page).toHaveURL(/\/tv$/)
  return token
}

test.describe('painel da TV', () => {
  test.skip(({ isMobile }) => isMobile, 'tela da TV')
  test.skip(semSeed, 'precisa do seed')
  test.describe.configure({ mode: 'serial' })

  test('conecta pelo link do dispositivo, tira o token da URL e para ao revogar', async ({
    page,
    request,
  }, info) => {
    const eng = await apiEngenheiro(request)
    const nome = `TV e2e ${info.project.name}-${Date.now() % 100000}`

    await page.goto('/tv')
    await expect(page.getByText('Dispositivo não autorizado')).toBeVisible()

    await conectarTv(page, eng, nome)
    await expect(page.getByText('Obra Demonstração')).toBeVisible()
    const dados = await page.request.get('/tv/dados')
    expect(dados.status()).toBe(200)
    expect(((await dados.json()) as { obra: string }).obra).toBe('Obra Demonstração')

    const [dispositivo] = await eng.get<{ id: string }[]>(
      `dispositivo_tv?select=id&nome=eq.${encodeURIComponent(nome)}`,
    )
    await eng.rpc('revogar_dispositivo', { p_dispositivo: dispositivo?.id })
    expect((await page.request.get('/tv/dados')).status()).toBe(401)
    // A TV aberta percebe sozinha no próximo ciclo.
    await expect(page.getByText('Dispositivo não autorizado')).toBeVisible({ timeout: 6_000 })
  })

  test('token inválido não vira cookie', async ({ page }) => {
    await page.goto('/tv/entrar?t=nao-e-um-token')
    await expect(page).toHaveURL(/\/tv$/)
    await expect(page.getByText('Dispositivo não autorizado')).toBeVisible()
    expect((await page.context().cookies()).some((c) => c.name === 'almox_tv')).toBe(false)
  })

  test('loop: páginas de 12 → colunas por empresa → volta à página 1', async ({
    page,
    request,
  }, info) => {
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
      const paginas = Math.ceil(n / 12)
      for (let i = 1; i < paginas; i++) {
        await expect(page.getByText(new RegExp(`^Pessoas ${i * 12 + 1}–`))).toBeVisible({
          timeout: 6_000,
        })
      }
      await expect(page.getByRole('heading', { name: 'POR EMPRESA' })).toBeVisible({
        timeout: 6_000,
      })
      await expect(page.getByRole('region', { name: 'Construtora' })).toBeVisible()
      // Sem contagens na TV (só o nome da empresa).
      await expect(page.getByText(/\d+ (itens|pessoas)/)).toHaveCount(0)
      await expect(page.getByText(/^Pessoas 1–12 de/)).toBeVisible({ timeout: 60_000 })
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

      await page.route('**/tv/dados', (rota) => rota.abort('internetdisconnected'))
      await expect(page.getByRole('status')).toContainText(/Sem conexão desde \d{2}:\d{2}/, {
        timeout: 6_000,
      })
      await expect(page.locator('article')).toHaveCount(cartoes)

      await page.unroute('**/tv/dados')
      await expect(page.getByText(/Sem conexão desde/)).toHaveCount(0, { timeout: 6_000 })
    } finally {
      await configurar(eng, PADRAO)
    }
  })
})
