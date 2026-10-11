import { expect, test } from '@playwright/test'

test.describe('app no celular', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')

  test('a raiz abre a tela inicial vazia com o visual do protótipo', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/inicio$/)
    await expect(page.getByText('ALMOX', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Retirada/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Devolução/ })).toBeVisible()
    await expect(page.getByText('Nenhum lançamento ainda.')).toBeVisible()

    // Amarelo segurança no atalho de retirada e fundo claro do app.
    await expect(page.getByRole('button', { name: /Retirada/ })).toHaveCSS(
      'background-color',
      'rgb(245, 184, 0)',
    )
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 242, 238)')
  })

  test('não tem rolagem horizontal e os alvos de toque têm 44 px', async ({ page }) => {
    await page.goto('/inicio')
    const larguras = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      tela: window.innerWidth,
    }))
    expect(larguras.pagina).toBeLessThanOrEqual(larguras.tela)

    for (const link of await page.getByRole('navigation').getByRole('link').all()) {
      const caixa = await link.boundingBox()
      expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  })

  test('a barra inferior navega entre as abas', async ({ page }) => {
    await page.goto('/inicio')
    await page.getByRole('link', { name: 'Estoque' }).click()
    await expect(page).toHaveURL(/\/estoque$/)
    await expect(page.getByRole('heading', { name: 'Estoque' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Estoque' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

test.describe('PWA', () => {
  test('manifest instalável com ícones válidos', async ({ page, request }) => {
    await page.goto('/inicio')
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

  test('tem ícone e meta tags para iPhone', async ({ page }) => {
    await page.goto('/inicio')
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
      'content',
      'Almox',
    )
  })

  test('registra o service worker', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit do Playwright não expõe service worker')
    await page.goto('/inicio')
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
    await expect(page.locator('div:has(> header)').first()).toHaveCSS(
      'background-color',
      'rgb(17, 19, 23)',
    )
  })
})
