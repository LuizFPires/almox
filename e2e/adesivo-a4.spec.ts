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
    // Montagem: já com a pessoa escolhida e o tamanho Médio (12 por folha).
    await expect(page.getByRole('heading', { name: 'Imprimir adesivos' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /^Médio/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(page.getByRole('button', { name: /^Espaço 1: / })).toHaveAccessibleName(
      `Espaço 1: ${pessoa!.nome_capacete}`,
    )
    await page.getByRole('link', { name: 'Imprimir 1 adesivo · 1 folha' }).click()

    await expect(page.getByRole('heading', { name: 'Adesivos em A4' })).toBeVisible()
    await expect(page.getByText('1 adesivo · 1 folha · Médio')).toBeVisible()
    await expect(
      page.getByRole('figure', { name: `Adesivo de ${pessoa!.nome_capacete}` }).first(),
    ).toBeVisible()
    // A folha (só no papel) tem o adesivo em 5 × 6,5 cm.
    const folha = page
      .locator('body > #folhas-a4')
      .getByRole('region', { name: 'Folha 1', includeHidden: true })
    await expect(folha.locator('figure')).toHaveCount(1)
    expect(await folha.locator('figure').getAttribute('style')).toContain('50mm')

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

  test('folha aproveitada: pula os espaços usados e as seguintes vêm cheias', async ({ page }) => {
    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto('/cadastros/adesivos')
    // Grande (9 por folha), com os 2 primeiros espaços da folha já usados.
    await page.getByRole('radio', { name: /^Grande/ }).click()
    await page.getByRole('button', { name: 'Espaço 1: livre' }).click()
    await page.getByRole('button', { name: 'Espaço 2: livre' }).click()
    await expect(page.getByRole('button', { name: 'Espaço 1: já usado' })).toBeVisible()
    const todos = page.getByRole('button', { name: /^Todos da obra \(\d+\)$/ })
    const n = Math.min(Number((await todos.innerText()).replace(/\D/g, '')), 96)
    await todos.click()
    const folhas = Math.ceil((n + 2) / 9)
    await page.getByRole('link', { name: `Imprimir ${n} adesivos · ${folhas} folhas` }).click()
    await expect(page.getByText(`${n} adesivos · ${folhas} folhas · Grande`)).toBeVisible()
    const folhasA4 = page.locator('body > #folhas-a4')
    // Primeira folha: 7 adesivos (2 espaços em branco); a segunda, cheia.
    await expect(
      folhasA4.getByRole('region', { name: 'Folha 1', includeHidden: true }).locator('figure'),
    ).toHaveCount(7)
    await expect(
      folhasA4.getByRole('region', { name: 'Folha 2', includeHidden: true }).locator('figure'),
    ).toHaveCount(Math.min(9, n - 7))
  })

  test('almoxarife não abre a folha de adesivos', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/inicio')
    await page.goto('/cadastros/adesivos/a4')
    await expect(page.getByText('Só o engenheiro cadastra')).toBeVisible()
  })
})
