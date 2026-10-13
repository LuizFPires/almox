import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ambiente, entrarComo, semSeed } from './apoio'

const OBRA = 'a0000000-0000-4000-8000-000000000001'
const MAILPIT = 'http://127.0.0.1:54424'

/** Login novo de almoxarife na obra do seed (e-mail único: o Auth manda 1 código por minuto). */
async function criarLogin(request: APIRequestContext, nome: string) {
  const { url, chaveSecreta } = ambiente()
  const headers = { apikey: chaveSecreta, Authorization: `Bearer ${chaveSecreta}` }
  const email = `${nome}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.exemplo`
  const criado = await request.post(`${url}/auth/v1/admin/users`, {
    headers,
    data: { email, password: 'senha-antiga-123', email_confirm: true, user_metadata: { nome } },
  })
  expect(criado.ok(), await criado.text()).toBeTruthy()
  const { id } = (await criado.json()) as { id: string }
  const vinculo = await request.post(`${url}/rest/v1/usuario_obra`, {
    headers,
    data: { usuario_id: id, obra_id: OBRA, perfil: 'almoxarife' },
  })
  expect(vinculo.ok(), await vinculo.text()).toBeTruthy()
  return email
}

/** Código de 8 dígitos do e-mail de recuperação na caixa de teste (Mailpit). */
async function codigoRecebido(request: APIRequestContext, email: string) {
  let codigo = ''
  await expect(async () => {
    const busca = await request.get(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    )
    const { messages } = (await busca.json()) as { messages: { ID: string; Subject: string }[] }
    const mensagem = messages.find((m) => m.Subject === 'Seu código do Almox')
    expect(mensagem).toBeTruthy()
    const resposta = await request.get(`${MAILPIT}/api/v1/message/${mensagem?.ID}`)
    const { Text } = (await resposta.json()) as { Text: string }
    codigo = Text.match(/\b\d{8}\b/)?.[0] ?? ''
    expect(codigo).toHaveLength(8)
  }).toPass({ timeout: 15_000 })
  return codigo
}

async function preencherSenhaNova(page: Page, senha: string) {
  await page.getByLabel('Nova senha', { exact: true }).fill(senha)
  await page.getByLabel('Repita a nova senha', { exact: true }).fill(senha)
}

async function entrarCom(page: Page, email: string, senha: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').filter({ visible: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test.describe('senha pelo código do e-mail', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do Supabase local e da caixa de teste')

  test('o olho mostra e esconde a senha no login', async ({ page }) => {
    await page.goto('/login')
    const senha = page.getByLabel('Senha', { exact: true })
    await senha.fill('segredo-qualquer')
    await expect(senha).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Mostrar senha' }).click()
    await expect(senha).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Esconder senha' }).click()
    await expect(senha).toHaveAttribute('type', 'password')
    // Sem o link mágico: senha, e código no e-mail para criar ou recuperar.
    await expect(page.getByText(/link no e-mail/)).toHaveCount(0)
  })

  test('esqueci a senha: código no e-mail, senha nova e entra', async ({ page, request }) => {
    const email = await criarLogin(request, 'esqueci')
    await page.goto('/login')
    await page.getByRole('link', { name: 'Esqueci ou ainda não tenho senha' }).click()
    await expect(page.getByRole('heading', { name: 'Recuperar acesso' })).toBeVisible()
    await page.getByLabel('E-mail').filter({ visible: true }).fill(email)
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByLabel('Código do e-mail')).toBeVisible()

    // Código errado: avisa e não troca nada.
    await page.getByLabel('Código do e-mail').fill('00000000')
    await preencherSenhaNova(page, 'senha-nova-123')
    await page.getByRole('button', { name: 'Salvar senha' }).click()
    await expect(page.getByText(/Código inválido ou vencido/)).toBeVisible()

    await page.getByLabel('Código do e-mail').fill(await codigoRecebido(request, email))
    await page.getByRole('button', { name: 'Salvar senha' }).click()
    await page.waitForURL((u) => u.pathname === '/inicio')

    // A senha nova vale; a antiga não.
    await page.context().clearCookies()
    await entrarCom(page, email, 'senha-antiga-123')
    await expect(page.getByRole('alert').filter({ hasText: 'E-mail' })).toHaveText(
      'E-mail ou senha incorretos.',
    )
    await entrarCom(page, email, 'senha-nova-123')
    await page.waitForURL((u) => u.pathname === '/inicio')
  })

  test('e-mail sem acesso recebe a mesma resposta', async ({ page }) => {
    await page.goto('/recuperar-senha')
    await page
      .getByLabel('E-mail')
      .filter({ visible: true })
      .fill(`ninguem-${Date.now()}@teste.exemplo`)
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await expect(page.getByLabel('Código do e-mail')).toBeVisible()
    await expect(page.getByText(/Se houver acesso para/)).toBeVisible()
  })

  test('trocar a senha na Conta também pede o código do e-mail', async ({ page, request }) => {
    const email = await criarLogin(request, 'trocar')
    await entrarCom(page, email, 'senha-antiga-123')
    await page.waitForURL((u) => u.pathname === '/inicio')

    await page.goto('/conta')
    await page.getByRole('link', { name: 'Trocar senha' }).click()
    await expect(page.getByRole('heading', { name: 'Trocar senha' })).toBeVisible()
    // O código vai para o e-mail da própria conta, que não se troca aqui.
    await expect(page.getByLabel('E-mail').filter({ visible: true })).toHaveValue(email)
    await expect(page.getByLabel('E-mail').filter({ visible: true })).toHaveAttribute(
      'readonly',
      '',
    )
    await page.getByRole('button', { name: 'Enviar código' }).click()

    await page.getByLabel('Código do e-mail').fill(await codigoRecebido(request, email))
    await preencherSenhaNova(page, 'senha-trocada-456')
    await page.getByRole('button', { name: 'Salvar senha' }).click()
    await page.waitForURL((u) => u.pathname === '/inicio')
  })

  test('a tela antiga de trocar senha só serve para a senha provisória', async ({ page }) => {
    await entrarComo(page, 'almoxarife')
    await page.goto('/trocar-senha')
    await page.waitForURL((u) => u.pathname === '/recuperar-senha')
  })
})
