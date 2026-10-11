import { expect, test, type APIRequestContext, type Browser } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'
import { CELULAR, navegadorComQr } from './camera'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

/** Token do capacete de uma pessoa do seed (lido como engenheiro, via dados_adesivo). */
async function capaceteDe(request: APIRequestContext, nome: string) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS.engenheiro, password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}` }
  const pessoas = (await (
    await request.get(
      `${url}/rest/v1/pessoa?select=id&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent(nome)}`,
      { headers },
    )
  ).json()) as { id: string }[]
  const id = pessoas[0]?.id ?? ''
  const [dados] = (await (
    await request.post(`${url}/rest/v1/rpc/dados_adesivo`, { headers, data: { p_pessoa: id } })
  ).json()) as { token: string }[]
  const posses = async () =>
    (
      (await (
        await request.get(`${url}/rest/v1/posse?select=unidade_id&pessoa_id=eq.${id}`, { headers })
      ).json()) as unknown[]
    ).length
  const movimentos = async () =>
    (
      (await (
        await request.get(`${url}/rest/v1/movimento?select=id&pessoa_id=eq.${id}`, { headers })
      ).json()) as unknown[]
    ).length
  return { id, token: dados?.token ?? '', posses, movimentos }
}

/** Abre o app num Chromium cuja câmera mostra o QR e entra com o perfil. */
async function celularLendo(
  qr: string,
  perfil: keyof typeof USUARIOS,
  baseURL: string | undefined,
): Promise<{ navegador: Browser; pagina: Awaited<ReturnType<Browser['newPage']>> }> {
  const navegador = await navegadorComQr(qr)
  const pagina = await navegador.newPage({ ...CELULAR, baseURL })
  await entrarComo(pagina, perfil, '/inicio')
  return { navegador, pagina }
}

test.describe('identificação pelo QR do capacete', () => {
  test.skip(
    ({ browserName, isMobile }) => !isMobile || browserName !== 'chromium',
    'câmera falsa do Chromium',
  )
  test.skip(semSeed, 'precisa do seed')
  test.describe.configure({ mode: 'serial' })

  test('almoxarife lê o QR, confere e abre a ficha com Retirada/Devolução', async ({
    request,
    baseURL,
  }) => {
    const joaquim = await capaceteDe(request, 'Joaquim Silva')
    const { navegador, pagina } = await celularLendo(joaquim.token, 'almoxarife', baseURL)
    try {
      await pagina.getByRole('link', { name: /Ler QR do capacete/ }).click()
      await expect(pagina.getByText('QR lido · capacete cadastrado')).toBeVisible({
        timeout: 15_000,
      })
      await expect(pagina.getByText('É o Joaquim que está na sua frente?')).toBeVisible()
      await pagina.getByRole('button', { name: 'Sim, é o Joaquim' }).click()
      await pagina.waitForURL((u) => u.pathname === `/pessoa/${joaquim.id}`)
      await expect(pagina.getByText('QR do capacete · pessoa conferida')).toBeVisible()
      await expect(pagina.getByRole('link', { name: 'Retirada' })).toBeVisible()
      await expect(pagina.getByRole('link', { name: 'Devolução' })).toBeVisible()
      // A mesma pessoa aberta pela lista manual não herda a conferência do QR.
      await pagina.goto(`/pessoa/${joaquim.id}?via=manual`)
      await expect(pagina.getByText('Escolhido na lista · sem QR')).toBeVisible()
    } finally {
      await navegador.close()
    }
  })

  test('"Não é ele" bloqueia, anota a ocorrência e não mexe em nenhuma posse', async ({
    request,
    baseURL,
  }) => {
    const joaquim = await capaceteDe(request, 'Joaquim Silva')
    const antes = await joaquim.posses()
    const movimentosAntes = await joaquim.movimentos()
    const { navegador, pagina } = await celularLendo(joaquim.token, 'almoxarife', baseURL)
    try {
      await pagina.goto('/leitura')
      await pagina.getByRole('button', { name: 'Não é ele' }).click({ timeout: 15_000 })
      await expect(pagina.getByRole('heading', { name: 'Nada foi registrado' })).toBeVisible()
      await expect(pagina.getByText(/A ocorrência ficou anotada no histórico/)).toBeVisible()
      expect(await joaquim.posses()).toBe(antes)
      expect(await joaquim.movimentos()).toBe(movimentosAntes)
      await pagina.goto('/inicio')
      await expect(
        pagina.getByText('Bloqueado: capacete usado por outra pessoa').first(),
      ).toBeVisible()
    } finally {
      await navegador.close()
    }
  })

  test('sem internet na conferência: avisa na tela em vez de quebrar', async ({
    request,
    baseURL,
  }) => {
    const joaquim = await capaceteDe(request, 'Joaquim Silva')
    const { navegador, pagina } = await celularLendo(joaquim.token, 'almoxarife', baseURL)
    try {
      await pagina.goto('/leitura')
      await expect(pagina.getByText('É o Joaquim que está na sua frente?')).toBeVisible({
        timeout: 15_000,
      })
      await pagina.context().setOffline(true)
      await pagina.getByRole('button', { name: 'Sim, é o Joaquim' }).click()
      await expect(pagina.getByText('Sem conexão com o Almox. Tente de novo.')).toBeVisible()
      await pagina.getByRole('button', { name: 'Não é ele' }).click()
      await expect(pagina.getByRole('heading', { name: 'Nada foi registrado' })).toBeVisible()
      await expect(pagina.getByText(/Não foi possível anotar a ocorrência agora/)).toBeVisible()
    } finally {
      await navegador.close()
    }
  })

  test('consulta lê o mesmo QR e vê a ficha sem botões', async ({ request, baseURL }) => {
    const joaquim = await capaceteDe(request, 'Joaquim Silva')
    const { navegador, pagina } = await celularLendo(joaquim.token, 'mestre', baseURL)
    try {
      await pagina.getByRole('link', { name: /Ler QR do capacete/ }).click()
      await pagina.waitForURL((u) => u.pathname === `/pessoa/${joaquim.id}`, { timeout: 15_000 })
      await expect(pagina.getByText('QR do capacete lido')).toBeVisible()
      await expect(
        pagina.getByText('Só consulta. Para retirar ou devolver, procure o almoxarifado.'),
      ).toBeVisible()
      await expect(pagina.getByRole('link', { name: 'Retirada' })).toHaveCount(0)
    } finally {
      await navegador.close()
    }
  })

  test('empreiteira lê capacete de outra empresa: sem nome', async ({ request, baseURL }) => {
    const joaquim = await capaceteDe(request, 'Joaquim Silva')
    const { navegador, pagina } = await celularLendo(joaquim.token, 'formas', baseURL)
    try {
      await pagina.goto('/leitura')
      await expect(pagina.getByText('Pessoa de outra empresa')).toBeVisible({ timeout: 15_000 })
      await expect(pagina.getByText('Joaquim')).toHaveCount(0)
      // Início da empreiteira: só números da própria empresa.
      await pagina.goto('/inicio')
      await expect(pagina.getByText('com a Fôrmas Ribeiro', { exact: true })).toBeVisible()
      await expect(pagina.getByText('no almox', { exact: true })).toHaveCount(0)
    } finally {
      await navegador.close()
    }
  })

  test('QR que não é de capacete: "Capacete não cadastrado"', async ({ baseURL }) => {
    const { navegador, pagina } = await celularLendo(
      'https://exemplo.com/cardapio',
      'almoxarife',
      baseURL,
    )
    try {
      await pagina.goto('/leitura')
      await expect(pagina.getByText('Capacete não cadastrado')).toBeVisible({ timeout: 15_000 })
      await expect(pagina.getByRole('button', { name: 'Ler de novo' })).toBeVisible()
    } finally {
      await navegador.close()
    }
  })
})
