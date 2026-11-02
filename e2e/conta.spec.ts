import { expect, test, type Page } from '@playwright/test'
import { codigoRecebido, entrarComo, semSeed } from './apoio'

async function entrarCom(page: Page, email: string, senha: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').filter({ visible: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test.describe('criar conta e ser liberado pelo engenheiro', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do Supabase local e da caixa de teste')

  test('login mostra os dois caminhos grandes', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: 'Esqueci a senha' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible()
  })

  test('a conta nasce sem obra, confirma o e-mail pelo código e o engenheiro libera', async ({
    page,
    request,
  }) => {
    const email = `nova-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.exemplo`

    // 1. A pessoa cria a conta: nome e e-mail, depois código e senha.
    await page.goto('/login')
    await page.getByRole('link', { name: 'Criar conta' }).click()
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()
    await page.getByLabel('Seu nome').fill('Rafael Souza')
    await page.getByLabel('E-mail').filter({ visible: true }).fill(email)
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible()
    await expect(page.getByText(/Enviamos um código para/)).toBeVisible()

    await page.getByLabel('Código do e-mail').fill(await codigoRecebido(request, email))
    await page.getByLabel('Nova senha', { exact: true }).fill('senha-da-conta-123')
    await page.getByLabel('Repita a nova senha', { exact: true }).fill('senha-da-conta-123')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    // Sem obra: a tela diz o que pedir ao engenheiro, com o e-mail.
    await page.waitForURL((u) => u.pathname === '/sem-acesso')
    await expect(page.getByRole('heading', { name: 'Falta o engenheiro liberar' })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()

    // A senha escolhida vale para entrar (e o e-mail ficou confirmado no Auth).
    await page.context().clearCookies()
    await entrarCom(page, email, 'senha-da-conta-123')
    await page.waitForURL((u) => u.pathname === '/sem-acesso')
    await page.context().clearCookies()

    // 2. A engenheira encontra a conta em Acessos e dá o acesso, sem senha inicial.
    await entrarComo(page, 'engenheiro')
    await page.goto('/cadastros/usuarios')
    const aguardando = page.getByRole('link', { name: new RegExp(`Rafael Souza.*${email}`) })
    await expect(aguardando).toBeVisible()
    await aguardando.click()
    await expect(page.getByText(/criou a conta sozinha/)).toBeVisible()
    await expect(page.getByLabel('E-mail').filter({ visible: true })).toHaveValue(email)
    await expect(page.getByText('Senha do primeiro acesso')).toHaveCount(0)
    await page.locator('label').filter({ hasText: 'Almoxarife' }).filter({ visible: true }).click()
    await page.getByRole('button', { name: 'Dar acesso' }).click()
    await expect(page.getByRole('heading', { name: 'Acesso liberado' })).toBeVisible()
    await expect(page.getByText('A pessoa entra com a senha que já usa.')).toBeVisible()
    await page.getByRole('link', { name: 'Pronto' }).click()
    await expect(aguardando).toHaveCount(0)
    await page.context().clearCookies()

    // 3. Agora a pessoa entra na obra como almoxarife.
    await entrarCom(page, email, 'senha-da-conta-123')
    await page.waitForURL((u) => u.pathname === '/inicio')
    await expect(page.getByRole('link', { name: /conta e obra/ })).toHaveText('Almoxarife')
  })

  test('e-mail que já tem conta recebe a mesma tela (sem dizer que existe)', async ({ page }) => {
    await page.goto('/criar-conta')
    await page.getByLabel('Seu nome').fill('Helena de Novo')
    await page.getByLabel('E-mail').filter({ visible: true }).fill('engenheiro@almox.exemplo')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible()
    await expect(page.getByText(/Enviamos um código para/)).toBeVisible()
  })

  test('nome e e-mail inválidos avisam no campo', async ({ page }) => {
    await page.goto('/criar-conta')
    await page.getByLabel('Seu nome').fill('R')
    await page.getByLabel('E-mail').filter({ visible: true }).fill('rafael@obra')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByText('Informe o seu nome.')).toBeVisible()
    await expect(page.getByText('E-mail inválido.')).toBeVisible()
  })
})
