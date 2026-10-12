import { expect, test } from '@playwright/test'
import { entrarComo, semSeed } from './apoio'

test.describe('configuração do painel da TV', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do seed')

  test('engenheiro abre pelo Cadastros, erro fora dos limites e salva', async ({ page }) => {
    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto('/cadastros/pessoas')
    await page.getByRole('link', { name: /Painel da TV/ }).click()
    await expect(page.getByRole('heading', { name: 'Painel da TV' })).toBeVisible()

    const tempo = page.getByLabel('Tempo por página (segundos)')
    const atual = await tempo.inputValue()
    await tempo.fill('2')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('De 3 a 30 segundos.')).toBeVisible()

    // Salva o que já estava (os testes da TV usam a mesma obra ao mesmo tempo).
    await page.getByLabel('Tempo por página (segundos)').fill(atual)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Configuração salva. A TV muda em até 2 segundos.')).toBeVisible()
  })

  test('almoxarife não configura', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/inicio')
    await page.goto('/cadastros/painel-tv')
    await expect(page.getByText('Só o engenheiro cadastra')).toBeVisible()
    await expect(page.getByLabel('Tempo por página (segundos)')).toHaveCount(0)
  })
})
