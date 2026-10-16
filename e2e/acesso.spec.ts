import { expect, test, type Page } from '@playwright/test'
import { entrarComo, semSeed } from './apoio'

const campo = (page: Page, rotulo: string) =>
  page.getByLabel(rotulo, { exact: true }).filter({ visible: true })

/** Dá acesso de almoxarife; com `senha`, o engenheiro escolhe a senha do primeiro acesso. */
async function darAcesso(page: Page, email: string, senha?: string) {
  await page.goto('/cadastros/acesso/novo')
  await campo(page, 'Nome').fill('Acesso Teste')
  await campo(page, 'E-mail').fill(email)
  await page.locator('label').filter({ hasText: 'Almoxarife' }).filter({ visible: true }).click()
  if (senha) {
    await page.getByLabel('Eu escolho a senha').filter({ visible: true }).check()
    await campo(page, 'Senha inicial').fill(senha)
  }
  await page.getByRole('button', { name: 'Dar acesso' }).click()
  return (await page.getByLabel('Senha provisória').filter({ visible: true }).innerText()).trim()
}

async function entrar(page: Page, email: string, senha: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.locator('input[name=email]').fill(email)
  await page.locator('input[name=senha]').fill(senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test.describe('dar acesso: senha do primeiro acesso', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa dos usuários do seed')

  test('o engenheiro escolhe a senha inicial e a pessoa cria a dela ao entrar', async ({
    page,
  }, info) => {
    const email = `escolhida-${info.project.name}-${Date.now()}@teste.exemplo`
    await entrarComo(page, 'engenheiro', '/inicio')

    // Curta demais: recusada no campo.
    await page.goto('/cadastros/acesso/novo')
    await campo(page, 'Nome').fill('Acesso Teste')
    await campo(page, 'E-mail').fill(email)
    await page.locator('label').filter({ hasText: 'Almoxarife' }).filter({ visible: true }).click()
    await page.getByLabel('Eu escolho a senha').filter({ visible: true }).check()
    await campo(page, 'Senha inicial').fill('curta')
    await page.getByRole('button', { name: 'Dar acesso' }).click()
    await expect(campo(page, 'Senha inicial')).toBeVisible()

    expect(await darAcesso(page, email, 'obra-betim-2026')).toBe('obra-betim-2026')
    await entrar(page, email, 'obra-betim-2026')
    await page.waitForURL((u) => u.pathname === '/trocar-senha')
    await expect(page.getByRole('heading', { name: 'Crie sua senha' })).toBeVisible()
  })

  test('perdeu a senha do primeiro acesso: o engenheiro gera outra e a anterior para de valer', async ({
    page,
  }, info) => {
    const email = `nova-${info.project.name}-${Date.now()}@teste.exemplo`
    await entrarComo(page, 'engenheiro', '/inicio')
    const primeira = await darAcesso(page, email)

    await page.goto('/cadastros/usuarios')
    await page.getByText(email).filter({ visible: true }).click()
    await page.waitForURL((u) => u.pathname.startsWith('/cadastros/acesso/'))
    await page.getByText('Ainda não entrou: gerar nova senha do primeiro acesso').click()
    await page.getByLabel('Eu escolho a senha').filter({ visible: true }).check()
    await campo(page, 'Senha inicial').fill('nova-senha-2026')
    await page.getByRole('button', { name: 'Gerar nova senha' }).click()
    await expect(page.getByLabel('Senha do primeiro acesso').filter({ visible: true })).toHaveText(
      'nova-senha-2026',
    )

    await entrar(page, email, primeira)
    await expect(page.getByRole('alert').filter({ hasText: 'E-mail' })).toHaveText(
      'E-mail ou senha incorretos.',
    )
    await entrar(page, email, 'nova-senha-2026')
    await page.waitForURL((u) => u.pathname === '/trocar-senha')
  })

  test('almoxarife que esqueceu a própria senha: o engenheiro gera uma nova', async ({
    page,
    browser,
  }, info) => {
    const email = `esqueceu-${info.project.name}-${Date.now()}@teste.exemplo`
    await entrarComo(page, 'engenheiro', '/inicio')
    await darAcesso(page, email, 'primeira-2026')

    // A pessoa, no celular dela, entra e cria a senha dela.
    const celular = await browser.newContext({
      ...info.project.use,
      baseURL: new URL(page.url()).origin,
    })
    const pessoa = await celular.newPage()
    try {
      await entrar(pessoa, email, 'primeira-2026')
      await pessoa.waitForURL((u) => u.pathname === '/trocar-senha')
      await pessoa.getByLabel('Nova senha', { exact: true }).fill('dela-mesma-2026')
      await pessoa.getByLabel('Repita a nova senha', { exact: true }).fill('dela-mesma-2026')
      await pessoa.getByRole('button', { name: 'Salvar nova senha' }).click()
      await pessoa.waitForURL((u) => u.pathname === '/inicio')

      // Esqueceu: o engenheiro gera outra no acesso dela.
      await page.goto('/cadastros/usuarios')
      await page.getByText(email).filter({ visible: true }).click()
      await page.waitForURL((u) => u.pathname.startsWith('/cadastros/acesso/'))
      await page.getByText('Esqueceu a senha: gerar uma senha nova').click()
      await page.getByLabel('Eu escolho a senha').filter({ visible: true }).check()
      await campo(page, 'Senha inicial').fill('voltou-2026!')
      await page.getByRole('button', { name: 'Gerar nova senha' }).click()
      await expect(
        page.getByLabel('Senha do primeiro acesso').filter({ visible: true }),
      ).toHaveText('voltou-2026!')

      // Entra com a nova e é obrigada a criar outra só dela.
      await entrar(pessoa, email, 'voltou-2026!')
      await pessoa.waitForURL((u) => u.pathname === '/trocar-senha')
    } finally {
      await celular.close()
    }
  })
})
