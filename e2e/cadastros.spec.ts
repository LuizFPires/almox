import { expect, test, type Page } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'

/** Token de um usuário do seed direto no Auth (para conferir o banco pela API). */
async function tokenDe(page: Page, email: string) {
  const { url, chave } = ambiente()
  const resposta = await page.request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email, password: SENHA_SEED },
  })
  return ((await resposta.json()) as { access_token: string }).access_token
}

/** Campo pelo rótulo, só na tela visível (o Next mantém telas anteriores escondidas). */
const campo = (page: Page, rotulo: string) =>
  page.getByLabel(rotulo, { exact: true }).filter({ visible: true })

test.describe('cadastros do engenheiro', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa dos usuários do seed')

  test('empresa → pessoa → ferramenta com 5 unidades a R$ 2.890,00 (salvo 289000)', async ({
    page,
  }, info) => {
    const sufixo = `${info.project.name}-${Date.now() % 100000}`
    const empresa = `Pinturas ${sufixo}`
    await entrarComo(page, 'engenheiro', '/inicio')

    await page.goto('/cadastros/empresa/nova')
    await campo(page, 'Nome da empresa').fill(empresa)
    await campo(page, 'Nome').fill('Dono Teste')
    await campo(page, 'E-mail').fill('dono@teste.exemplo')
    await page.getByRole('button', { name: 'Salvar empresa' }).click()
    await page.waitForURL((u) => u.pathname === '/cadastros/empresas')
    await expect(page.getByText(empresa, { exact: true })).toBeVisible()

    await page.goto('/cadastros/pessoa/nova')
    await campo(page, 'Nome completo').fill(`Pedro ${sufixo} Costa`)
    await page.getByText('Pintor', { exact: true }).click()
    await page.locator('label').filter({ hasText: empresa }).click()
    await page.getByRole('button', { name: 'Salvar sem imprimir' }).click()
    await page.waitForURL((u) => u.pathname === '/cadastros/pessoas')
    // Capacete sugerido na tela ou preenchido pelo servidor (se digitou antes de a página
    // carregar): 'PEDRO', ou 'PEDRO C.' se outro teste já criou um PEDRO na obra.
    await expect(
      page.getByRole('link', { name: new RegExp(`Pedro ${sufixo} Costa`) }),
    ).toContainText(/PEDRO( C\.)? · Pintor/)

    const ferramenta = `Rompedor ${sufixo}`
    await page.goto('/cadastros/ferramenta/nova')
    await page.locator('label').filter({ hasText: 'Martelete' }).first().click()
    await campo(page, 'Nome').fill(ferramenta)
    // Prefixo único por execução (o CI repete o teste em caso de falha e o prefixo é único na obra).
    const prefixo = String(Date.now() % 1_000_000)
      .padStart(6, '0')
      .replace(/\d/g, (d) => 'ABCDEFGHJK'[Number(d)]!)
      .slice(-4)
    await campo(page, 'Prefixo do código').fill(prefixo)
    await campo(page, 'Valor de reposição (por unidade)').fill('2.890,00')
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Aumentar unidade' }).click()
    await expect(page.getByText(/Unidades novas/)).toContainText('-01 a ')
    await page.getByRole('button', { name: 'Salvar 5 unidades' }).click()
    await page.waitForURL((u) => u.pathname === '/cadastros/ferramentas')
    const linha = page.getByRole('link', { name: new RegExp(ferramenta) })
    await expect(linha).toContainText('5 un.')
    await expect(linha).toContainText('R$ 2.890,00')

    // No banco, em centavos.
    const { url, chave } = ambiente()
    const token = await tokenDe(page, USUARIOS.engenheiro)
    const resposta = await page.request.get(
      `${url}/rest/v1/tipo_ferramenta?select=valor_reposicao&nome=eq.${encodeURIComponent(ferramenta)}`,
      { headers: { apikey: chave, Authorization: `Bearer ${token}` } },
    )
    expect(await resposta.json()).toEqual([{ valor_reposicao: 289000 }])
  })

  test('almoxarife não cadastra: nem pela tela, nem pela API', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/inicio')
    await page.goto('/cadastros/ferramenta/nova')
    await expect(page.getByText('Só o engenheiro cadastra')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Salvar/ })).toHaveCount(0)

    const { url, chave } = ambiente()
    const token = await tokenDe(page, USUARIOS.almoxarife)
    const resposta = await page.request.post(`${url}/rest/v1/tipo_ferramenta`, {
      headers: { apikey: chave, Authorization: `Bearer ${token}` },
      data: {
        obra_id: 'a0000000-0000-4000-8000-000000000001',
        nome: 'Invasora',
        icone: 'pa',
        prefixo: 'INV',
        valor_reposicao: 100,
      },
    })
    expect(resposta.status()).toBe(403)
  })

  test('acesso novo entra com senha provisória e é obrigado a trocar', async ({ page }, info) => {
    const email = `acesso-${info.project.name}-${Date.now()}@teste.exemplo`
    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto('/cadastros/acesso/novo')
    await campo(page, 'Nome').fill('Acesso Teste')
    await campo(page, 'E-mail').fill(email)
    await page.locator('label').filter({ hasText: 'Consulta' }).first().click()
    await page
      .getByLabel('Restringir a uma empreiteira')
      .filter({ visible: true })
      .selectOption({ label: 'Fôrmas Ribeiro' })
    await page.getByRole('button', { name: 'Dar acesso' }).click()
    const senha = await page.getByLabel('Senha provisória').innerText()
    expect(senha).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)

    await page.context().clearCookies()
    await page.goto('/login')
    await page.locator('input[name=email]').fill(email)
    await page.locator('input[name=senha]').fill(senha)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL((u) => u.pathname === '/trocar-senha')
    await expect(page.getByRole('heading', { name: 'Crie sua senha' })).toBeVisible()

    await page.goto('/inicio')
    await page.waitForURL((u) => u.pathname === '/trocar-senha')

    await campo(page, 'Nova senha').fill('senha-nova-de-teste')
    await campo(page, 'Repita a nova senha').fill('senha-nova-de-teste')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await page.waitForURL((u) => u.pathname === '/inicio')
    await expect(page.getByRole('link', { name: /conta e obra/ })).toHaveText(
      'Consulta · Fôrmas Ribeiro',
    )
  })
})

test.describe('cadastros: tela anterior não volta com dados velhos', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa dos usuários do seed')

  test('dar acesso duas vezes seguidas não mostra a senha anterior', async ({ page }, info) => {
    const base = `duas-${info.project.name}-${Date.now()}`
    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto('/cadastros/usuarios')

    const dar = async (email: string) => {
      await page.getByRole('link', { name: 'Dar acesso' }).click()
      await page.waitForURL((u) => u.pathname === '/cadastros/acesso/novo')
      await expect(campo(page, 'E-mail')).toHaveValue('')
      await campo(page, 'Nome').fill('Duas Vezes')
      await campo(page, 'E-mail').fill(email)
      await page
        .locator('label')
        .filter({ hasText: 'Almoxarife' })
        .filter({ visible: true })
        .click()
      await page.getByRole('button', { name: 'Dar acesso' }).click()
      const senha = page.getByLabel('Senha provisória').filter({ visible: true })
      await expect(senha).toBeVisible()
      const texto = await senha.innerText()
      await page.getByRole('link', { name: 'Pronto' }).filter({ visible: true }).click()
      await page.waitForURL((u) => u.pathname === '/cadastros/usuarios')
      return texto
    }

    const primeira = await dar(`${base}-1@teste.exemplo`)
    const segunda = await dar(`${base}-2@teste.exemplo`)
    expect(segunda).not.toBe(primeira)
    await expect(page.getByText(`${base}-2@teste.exemplo`).filter({ visible: true })).toBeVisible()
  })
})
