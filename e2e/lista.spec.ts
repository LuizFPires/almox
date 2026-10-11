import { expect, test, type APIRequestContext } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'
import { CELULAR } from './camera'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

/** API com o login de um perfil do seed. */
async function api(request: APIRequestContext, perfil: keyof typeof USUARIOS) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS[perfil], password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}`, Prefer: 'return=representation' }
  const get = async <T>(caminho: string) =>
    (await (await request.get(`${url}/rest/v1/${caminho}`, { headers })).json()) as T
  const post = async <T>(caminho: string, data: unknown) =>
    (await (await request.post(`${url}/rest/v1/${caminho}`, { headers, data })).json()) as T
  return { get, post }
}

test.describe('lista e estoque', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do seed')

  test('retirada em outro celular atualiza lista e estoque sem recarregar', async ({
    page,
    browser,
    request,
    baseURL,
  }, info) => {
    const eng = await api(request, 'engenheiro')
    const nome = `Régua lista ${info.project.name}-${Date.now() % 100000}`
    const prefixo = Array.from({ length: 4 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join('')
    const [tipo] = await eng.post<{ id: string }[]>('tipo_ferramenta', {
      obra_id: OBRA,
      nome,
      icone: 'regua',
      prefixo,
      valor_reposicao: 5000,
    })
    await eng.post('rpc/adicionar_unidades', { p_tipo: tipo?.id, p_quantidade: 2 })
    const [ivan] = await eng.get<{ id: string }[]>(
      `pessoa?select=id&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent('Ivan Pereira')}`,
    )
    const [adesivo] = await eng.post<{ token: string }[]>('rpc/dados_adesivo', {
      p_pessoa: ivan?.id,
    })

    // Celular 1 (engenheiro): lista aberta. Celular 2: estoque aberto, linha do tipo novo expandida.
    await entrarComo(page, 'engenheiro', '/lista')
    const outro = await browser.newContext({ ...CELULAR, baseURL })
    try {
      const estoque = await outro.newPage()
      await entrarComo(estoque, 'engenheiro', '/estoque')
      const linha = estoque.getByRole('button', { name: new RegExp(nome) })
      await expect(linha).toContainText('2 /2')
      await linha.click()
      await expect(estoque.getByText('Todas no almoxarifado')).toBeVisible()

      // Retirada feita pelo almoxarife em um terceiro celular (API).
      const alm = await api(request, 'almoxarife')
      const [conf] = await alm.post<{ identificacao: string }[]>('rpc/conferir_pessoa', {
        p_obra: OBRA,
        p_token: adesivo?.token,
      })
      await alm.post('rpc/registrar_retirada', {
        p_obra: OBRA,
        p_pessoa: ivan?.id,
        p_identificacao: conf?.identificacao,
        p_itens: [{ tipo: tipo?.id, quantidade: 1 }],
        p_confirmado: true,
      })

      await expect(page.getByText(`${prefixo}-01`)).toBeVisible({ timeout: 10_000 })
      await expect(linha).toContainText('1 /2', { timeout: 10_000 })
      await expect(estoque.getByText(new RegExp(`${prefixo}-01 · Ivan Pereira · desde`))).toBeVisible()
    } finally {
      await outro.close()
    }
  })

  test('busca sem acento e por código da peça', async ({ page, request }) => {
    const eng = await api(request, 'engenheiro')
    const [mt02] = await eng.get<{ pessoa: { nome: string } }[]>(
      `posse?select=pessoa:pessoa!posse_pessoa_id_obra_id_fkey(nome),unidade:unidade!posse_unidade_id_obra_id_fkey!inner(codigo)` +
        `&obra_id=eq.${OBRA}&unidade.codigo=eq.MT-02`,
    )
    await entrarComo(page, 'engenheiro', '/lista')
    const busca = page.getByPlaceholder('Buscar pessoa ou código da peça')

    await busca.fill('jose')
    const cartoes = page.locator('main a[href^="/pessoa/"]')
    await expect(cartoes).toHaveCount(1)
    await expect(cartoes).toContainText('José Carlos')

    test.skip(!mt02, 'MT-02 está livre neste banco')
    await busca.fill('MT-02')
    await expect(cartoes).toHaveCount(1)
    await expect(cartoes).toContainText(mt02!.pessoa.nome)
  })

  test('consulta da empreiteira: só a própria empresa; estoque sem nomes de outras', async ({
    page,
  }) => {
    await entrarComo(page, 'formas', '/lista')
    await expect(page.getByRole('region', { name: 'Fôrmas Ribeiro' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Construtora' })).toHaveCount(0)
    await expect(page.getByText('Raimundo Alves')).toHaveCount(0)

    await page.goto('/estoque')
    await page.getByRole('button', { name: /^Martelete/ }).click()
    await expect(page.getByText(/com outras empresas/)).toBeVisible()
    await expect(page.getByText(/Raimundo Alves/)).toHaveCount(0)
  })
})
