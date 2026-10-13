import { expect, test, type APIRequestContext } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

/** Leitura pela API como engenheiro (confere o que a tela gravou). */
async function apiEngenheiro(request: APIRequestContext) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS.engenheiro, password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}` }
  return async <T>(caminho: string) => {
    const r = await request.get(`${url}/rest/v1/${caminho}`, { headers })
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
}

test.describe('adesivos em folha A4', () => {
  test.skip(semSeed, 'precisa do seed')

  test('da ficha: prévia, folha em tamanho real e marca como impresso', async ({
    page,
    request,
  }) => {
    const ler = await apiEngenheiro(request)
    const [pessoa] = await ler<{ id: string; nome_capacete: string }[]>(
      `pessoa?select=id,nome_capacete&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent('Joaquim Silva')}`,
    )
    expect(pessoa).toBeTruthy()
    // A janela de impressão do navegador não abre no teste: só registra que foi chamada.
    await page.addInitScript(() => {
      window.print = () => {
        document.documentElement.dataset.imprimiu = 'sim'
      }
    })

    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto(`/cadastros/pessoa/${pessoa!.id}/imprimir`)
    await page.getByRole('link', { name: 'Imprimir em folha A4' }).click()
    await expect(page.getByRole('heading', { name: 'Adesivos em A4' })).toBeVisible()
    await expect(page.getByText('1 adesivo · 1 folha')).toBeVisible()
    await expect(
      page.getByRole('figure', { name: `Prévia do adesivo de ${pessoa!.nome_capacete}` }).first(),
    ).toBeVisible()
    // A folha (só no papel) tem o adesivo em 60 × 80 mm.
    const folha = page
      .locator('body > #folhas-a4')
      .getByRole('region', { name: 'Folha 1', includeHidden: true })
    await expect(folha.locator('figure')).toHaveCount(1)
    expect(await folha.locator('figure').getAttribute('style')).toContain('60mm')

    await page.getByRole('button', { name: 'Imprimir 1 folha A4' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-imprimiu', 'sim')
    // Só marca depois de confirmar que as folhas saíram certas.
    await page.getByRole('button', { name: 'Sim, saíram certas' }).click()
    await expect(page.getByText(/1 adesivo marcado como impresso/)).toBeVisible()
    await expect
      .poll(async () => {
        const [p] = await ler<{ adesivo_impresso_em: string | null }[]>(
          `pessoa?select=adesivo_impresso_em&id=eq.${pessoa!.id}`,
        )
        return p?.adesivo_impresso_em ?? null
      })
      .not.toBeNull()
  })

  test('almoxarife não abre a folha de adesivos', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/inicio')
    await page.goto('/cadastros/adesivos/a4')
    await expect(page.getByText('Só o engenheiro cadastra')).toBeVisible()
  })
})
