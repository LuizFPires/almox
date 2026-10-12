import { expect, test, type APIRequestContext } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

async function api(request: APIRequestContext, perfil: keyof typeof USUARIOS) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS[perfil], password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}`, Prefer: 'return=representation' }
  const post = async <T>(caminho: string, data: unknown) => {
    const r = await request.post(`${url}/rest/v1/${caminho}`, { headers, data })
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const get = async <T>(caminho: string) =>
    (await (await request.get(`${url}/rest/v1/${caminho}`, { headers })).json()) as T
  return { post, get }
}

/** Ferramenta nova com uma retirada manual de Edson Lima (lançada pelo almoxarife). */
async function prepararLancamento(request: APIRequestContext, nome: string) {
  const eng = await api(request, 'engenheiro')
  const prefixo = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('')
  const [tipo] = await eng.post<{ id: string }[]>('tipo_ferramenta', {
    obra_id: OBRA,
    nome,
    icone: 'martelo',
    prefixo,
    valor_reposicao: 12345,
  })
  await eng.post('rpc/adicionar_unidades', { p_tipo: tipo?.id, p_quantidade: 1 })
  const [edson] = await eng.get<{ id: string }[]>(
    `pessoa?select=id&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent('Edson Lima')}`,
  )
  const alm = await api(request, 'almoxarife')
  await alm.post('rpc/registrar_retirada', {
    p_obra: OBRA,
    p_pessoa: edson?.id,
    p_identificacao: null,
    p_itens: [{ tipo: tipo?.id, quantidade: 1 }],
    p_confirmado: true,
  })
  return { tipo: tipo?.id ?? '', codigo: `${prefixo}-01` }
}

test.describe('histórico e auditoria', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do seed')

  test('engenheiro filtra por ferramenta e vê quem lançou, a via e o código', async ({
    page,
    request,
  }, info) => {
    const nome = `Martelo hist ${info.project.name}-${Date.now() % 100000}`
    const { codigo } = await prepararLancamento(request, nome)

    await entrarComo(page, 'engenheiro', '/inicio')
    await page.getByRole('link', { name: 'Histórico e auditoria' }).click()
    await expect(page.getByRole('heading', { name: 'Histórico' })).toBeVisible()
    await page.getByLabel('Ferramenta').selectOption({ label: nome })
    await page.getByRole('button', { name: 'Filtrar' }).click()
    await expect(page.getByRole('status')).toHaveText('1 lançamento')
    await expect(page.getByText(`${nome} ${codigo}`)).toBeVisible()
    await expect(page.getByText(/manual · sem QR · por Sebastião Nunes/)).toBeVisible()
  })

  test('almoxarife não abre o histórico', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/inicio')
    await expect(page.getByRole('link', { name: 'Histórico e auditoria' })).toHaveCount(0)
    await page.goto('/historico')
    await page.waitForURL((u) => u.pathname === '/inicio')
  })
})
