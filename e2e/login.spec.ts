import { expect, test } from '@playwright/test'
import { entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'

test.describe('login e perfis', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa dos usuários do seed')

  test('sem login, qualquer tela leva ao login e depois volta para ela', async ({ page }) => {
    await page.goto('/estoque')
    await expect(page).toHaveURL(/\/login\?volta=%2Festoque$/)
    await page.getByLabel('E-mail').fill(USUARIOS.almoxarife)
    await page.getByLabel('Senha', { exact: true }).fill(SENHA_SEED)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL((url) => url.pathname === '/estoque')
  })

  test('senha errada mostra erro e mantém o e-mail', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(USUARIOS.almoxarife)
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    // O Next também tem um role=alert (anunciador de rotas), por isso o filtro.
    await expect(page.getByRole('alert').filter({ hasText: 'E-mail' })).toHaveText(
      'E-mail ou senha incorretos.',
    )
    await expect(page.getByLabel('E-mail')).toHaveValue(USUARIOS.almoxarife)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('engenheiro vê todas as abas e o perfil', async ({ page }) => {
    await entrarComo(page, 'engenheiro')
    await expect(page.getByRole('link', { name: /conta e obra/ })).toHaveText('Engenheiro')
    await expect(page.getByRole('navigation').getByRole('link')).toHaveText([
      'Início',
      'Lista',
      'Estoque',
      'Fechamento',
      'Cadastros',
    ])
  })

  test('almoxarife lança, mas não cadastra', async ({ page }) => {
    await entrarComo(page, 'almoxarife')
    await expect(page.getByRole('link', { name: /conta e obra/ })).toHaveText('Almoxarife')
    await expect(page.getByRole('link', { name: /Escolher na lista/ })).toBeVisible()
    await page.getByRole('link', { name: 'Cadastros' }).click()
    await expect(page.getByText('Só o engenheiro cadastra')).toBeVisible()
  })

  test('consulta não vê Fechamento nem Cadastros', async ({ page }) => {
    await entrarComo(page, 'mestre')
    await expect(page.getByText('Perfil de consulta.')).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link')).toHaveText([
      'Início',
      'Lista',
      'Estoque',
    ])
    await expect(page.getByRole('link', { name: /Escolher na lista/ })).toHaveCount(0)
  })

  test('consulta de empreiteira mostra a própria empresa', async ({ page }) => {
    await entrarComo(page, 'formas')
    await expect(page.getByRole('link', { name: /conta e obra/ })).toHaveText(
      'Consulta · Fôrmas Ribeiro',
    )
  })

  test('engenheiro troca de obra e o perfil muda junto', async ({ page }) => {
    await entrarComo(page, 'engenheiro')
    await page.getByRole('link', { name: /conta e obra/ }).click()
    await page.getByRole('button', { name: /Obra Demonstração B/ }).click()
    await page.waitForURL((url) => url.pathname === '/inicio')
    await expect(page.locator('header').getByText(/^Obra Demonstração B/)).toBeVisible()
    await expect(page.getByRole('link', { name: /conta e obra/ })).toHaveText('Consulta')
    await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(3)
  })

  test('sair encerra a sessão', async ({ page }) => {
    await entrarComo(page, 'almoxarife')
    await page.getByRole('link', { name: /conta e obra/ }).click()
    await page.getByRole('button', { name: 'Sair' }).click()
    await page.waitForURL((url) => url.pathname === '/login')
    await page.goto('/inicio')
    await expect(page).toHaveURL(/\/login$/)
  })
})
