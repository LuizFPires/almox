import { expect, test } from '@playwright/test'
import { entrarComo, semSeed } from './apoio'

test.describe('app no celular', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa dos usuários do seed')

  test.beforeEach(async ({ page }) => {
    await entrarComo(page, 'engenheiro')
  })

  test('a raiz abre a tela inicial com o visual do protótipo', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/inicio$/)
    await expect(page.getByRole('img', { name: 'almox' })).toBeVisible()
    const lerQr = page.getByRole('link', { name: /Ler QR do capacete/ })
    await expect(lerQr).toBeVisible()
    // Opção A: os números abrem a tela de cada um (lista, estoque, manutenção, não devolvidas).
    for (const [rotulo, destino] of [
      [/no canteiro/, '/lista'],
      [/livres no almox/, '/estoque'],
      [/em manutenção/, '/manutencao'],
      [/pendências?/, '/lista?aba=nao-devolvidas'],
    ] as const) {
      const bloco = page.getByRole('link', { name: rotulo }).filter({ visible: true }).first()
      await expect(bloco).toHaveAttribute('href', destino)
    }
    await expect(page.getByRole('heading', { name: 'REGISTRO DE MOVIMENTAÇÕES' })).toBeVisible()

    // Cores do Almox Design System: grafite no botão principal, canvas claro no fundo.
    await expect(lerQr).toHaveCSS('background-color', 'rgb(31, 41, 55)')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 247, 249)')
  })

  test('não tem rolagem horizontal e os alvos de toque têm 44 px', async ({ page }) => {
    await page.goto('/inicio')
    const larguras = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      tela: window.innerWidth,
    }))
    expect(larguras.pagina).toBeLessThanOrEqual(larguras.tela)

    await expect(page.getByRole('heading', { name: 'REGISTRO DE MOVIMENTAÇÕES' })).toBeVisible()
    const alvos = page.locator('main a, main button, nav a, header a').filter({ visible: true })
    for (const alvo of await alvos.all()) {
      const caixa = await alvo.boundingBox()
      // O Início atualiza ao vivo: alvo trocado no meio da medição não conta.
      if (!caixa) continue
      const nome = (await alvo.getAttribute('aria-label')) ?? (await alvo.innerText())
      expect.soft(caixa?.height ?? 0, nome).toBeGreaterThanOrEqual(44)
      expect.soft(caixa?.width ?? 0, nome).toBeGreaterThanOrEqual(44)
    }
  })

  test('a barra inferior segue a ordem do PRD', async ({ page }) => {
    await expect(page.getByRole('navigation').getByRole('link')).toHaveText([
      'Início',
      'Lista',
      'Estoque',
      'Fechamento',
      'Cadastros',
    ])
  })

  test('a barra inferior navega entre as abas', async ({ page }) => {
    await page.getByRole('link', { name: 'Estoque' }).click()
    await expect(page).toHaveURL(/\/estoque$/)
    await expect(page.getByRole('heading', { name: 'Ferramentas na obra' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Estoque' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

test.describe('PWA', () => {
  test.skip(({ isMobile }) => !isMobile, 'instalação é no celular')

  test('manifest instalável com ícones válidos', async ({ page, request }) => {
    await page.goto('/login')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()

    const manifest = await (await request.get(href ?? '')).json()
    expect(manifest).toMatchObject({
      short_name: 'Almox',
      start_url: '/inicio',
      display: 'standalone',
      lang: 'pt-BR',
    })
    const tamanhos = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)

    for (const icone of manifest.icons as { src: string }[]) {
      const resposta = await request.get(icone.src)
      expect(resposta.ok()).toBe(true)
      expect(resposta.headers()['content-type']).toContain('image/png')
    }
  })

  test('cabeçalhos de segurança: sem iframe, câmera só do app, HTTPS', async ({ request }) => {
    const h = (await request.get('/login')).headers()
    expect(h['x-frame-options']).toBe('DENY')
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['permissions-policy']).toContain('camera=(self)')
    expect(h['permissions-policy']).toContain('geolocation=()')
    expect(h['strict-transport-security']).toContain('max-age=')
  })

  test('tem ícone e meta tags para iPhone', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
      'content',
      'Almox',
    )
  })

  test('registra o service worker', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit do Playwright não expõe service worker')
    await page.goto('/login')
    const escopo = await page.evaluate(async () => {
      const registro = await navigator.serviceWorker.ready
      return registro.scope
    })
    expect(escopo).toMatch(/\/$/)
  })
})

test.describe('painel da TV', () => {
  test.skip(({ isMobile }) => isMobile, 'tela grande')

  test('abre em tela cheia no fundo escuro', async ({ page }) => {
    await page.goto('/tv')
    await expect(page.getByText('QUEM ESTÁ COM O QUÊ')).toBeVisible()
    await expect(page.getByText(/^\d{2}:\d{2}$/)).toBeVisible()
    await expect(page.getByTestId('painel-tv')).toHaveCSS('background-color', 'rgb(16, 23, 32)')
  })
})
