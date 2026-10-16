import { expect, test, type Page } from '@playwright/test'
import { entrarComo, semSeed } from './apoio'

const campo = (page: Page, rotulo: string) =>
  page.getByLabel(rotulo, { exact: true }).filter({ visible: true })

test.describe('administração: obras e engenheiros', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa dos usuários do seed')

  test('o administrador cria a obra, liga o engenheiro e desativa a obra', async ({
    page,
  }, info) => {
    const sufixo = `${info.project.name}-${Date.now()}`
    const nomeObra = `Obra Admin ${sufixo}`
    const email = `eng-${sufixo}@teste.exemplo`
    await entrarComo(page, 'engenheiro', '/inicio')

    await page.goto('/conta')
    await expect(page.getByRole('link', { name: /Administração/ })).toHaveAttribute(
      'href',
      '/administracao',
    )
    await page.goto('/administracao')
    await page.getByRole('link', { name: 'Nova obra' }).click()
    await campo(page, 'Nome da obra').fill(nomeObra)
    await campo(page, 'Endereço').fill('Rua do Teste, 1')
    await page.getByRole('button', { name: 'Criar obra' }).click()
    await page.waitForURL((u) => u.pathname.startsWith('/administracao/obra/'))
    await expect(page.getByText('Obra criada. Falta o engenheiro')).toBeVisible()

    await campo(page, 'Nome').fill('Engenheiro Teste')
    await campo(page, 'E-mail').fill(email)
    await page.getByLabel('Eu escolho a senha').filter({ visible: true }).check()
    await campo(page, 'Senha inicial').fill('obra-nova-26')
    await page.getByRole('button', { name: 'Ligar engenheiro' }).click()
    await expect(page.getByLabel('Senha provisória').filter({ visible: true })).toHaveText(
      'obra-nova-26',
    )

    await page.getByRole('link', { name: 'Pronto' }).click()
    await expect(page.getByText(email)).toBeVisible()
    await page.getByText('Situação da obra').click()
    await page.getByRole('button', { name: 'Desativar obra' }).click()
    await expect(page.getByRole('banner').getByText('Desativada')).toBeVisible()

    await page.goto('/administracao')
    await expect(
      page.getByRole('link', { name: new RegExp(nomeObra) }).getByText('Desativada'),
    ).toBeVisible()
  })

  test('quem não é administrador não vê a Administração', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/inicio')
    await page.goto('/conta')
    await expect(page.getByRole('link', { name: /Administração/ })).toHaveCount(0)
    await page.goto('/administracao')
    await expect(page.getByText(/não existe ou mudou de lugar/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Nova obra' })).toHaveCount(0)
  })
})
