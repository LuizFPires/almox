import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'
import { CELULAR, navegadorComQr } from './camera'

const OBRA = 'a0000000-0000-4000-8000-000000000001'
/** Foto da "avaria" (qualquer imagem serve: a tela comprime para JPEG antes de enviar). */
const FOTO = {
  name: 'avaria.png',
  mimeType: 'image/png',
  buffer: readFileSync('public/icones/icone-512.png'),
}

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
  const post = async (caminho: string, data: unknown) => {
    const r = await request.post(`${url}/rest/v1/${caminho}`, { headers, data })
    return { status: r.status(), corpo: (await r.json()) as unknown }
  }
  return { get, post }
}

/** Prepara: ferramenta própria do teste e a pessoa (com token do capacete). */
async function preparar(
  request: APIRequestContext,
  nomePessoa: string,
  ferramenta: string,
  unidades: number,
) {
  const eng = await api(request, 'engenheiro')
  const prefixo = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('')
  const tipo = (
    (
      await eng.post('tipo_ferramenta', {
        obra_id: OBRA,
        nome: ferramenta,
        icone: 'pa',
        prefixo,
        valor_reposicao: 10000,
      })
    ).corpo as { id: string }[]
  )[0]?.id
  await eng.post('rpc/adicionar_unidades', { p_tipo: tipo, p_quantidade: unidades })
  const [p] = await eng.get<{ id: string }[]>(
    `pessoa?select=id&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent(nomePessoa)}`,
  )
  const [d] = (await eng.post('rpc/dados_adesivo', { p_pessoa: p?.id })).corpo as {
    token: string
  }[]
  return { tipo: tipo ?? '', pessoa: p?.id ?? '', token: d?.token ?? '', eng }
}

test.describe('devolução e avaria', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do seed')
  test.describe.configure({ mode: 'serial' })

  test('devolve 1 de 2 pás, 1 avariada com foto: 1 em manutenção, 1 continua com ele', async ({
    browserName,
    request,
    baseURL,
  }, info) => {
    test.skip(browserName !== 'chromium', 'câmera falsa do Chromium')
    const nome = `Pá dev ${info.project.name}-${Date.now() % 100000}`
    const { tipo, pessoa, token, eng } = await preparar(request, 'Valter Gomes', nome, 2)
    // Retirada das 2 pás com QR, feita pelo almoxarife (API).
    const alm = await api(request, 'almoxarife')
    const [conf] = (await alm.post('rpc/conferir_pessoa', { p_obra: OBRA, p_token: token }))
      .corpo as { identificacao: string }[]
    await alm.post('rpc/registrar_retirada', {
      p_obra: OBRA,
      p_pessoa: pessoa,
      p_identificacao: conf?.identificacao,
      p_itens: [{ tipo, quantidade: 2 }],
      p_confirmado: true,
    })

    const navegador = await navegadorComQr(token)
    try {
      const pagina = await navegador.newPage({ ...CELULAR, baseURL })
      await entrarComo(pagina, 'almoxarife', '/inicio')
      await pagina.goto('/leitura')
      await pagina.getByRole('button', { name: 'Sim, é o Valter' }).click({ timeout: 15_000 })
      await pagina.getByRole('link', { name: 'Devolução' }).click()
      await expect(pagina.getByText('Marque o que voltou')).toBeVisible()
      const cartao = pagina.getByRole('region', { name: nome })
      await cartao.getByRole('button', { name: `Devolver mais uma ${nome}` }).click()
      await cartao.getByRole('button', { name: `Mais uma: avariadas ${nome}` }).click()
      await expect(pagina.getByRole('button', { name: 'Falta a foto da avaria' })).toBeDisabled()
      await cartao.getByRole('button', { name: 'Fotografar a avaria' }).click()
      await pagina.getByLabel(/Fotografar a avaria da/).setInputFiles(FOTO)
      await pagina.getByText('Cabo rompido', { exact: true }).click()
      await pagina.getByRole('button', { name: 'Usar esta foto' }).click()
      await expect(cartao.getByText('Foto anexada')).toBeVisible({ timeout: 15_000 })
      await expect(pagina.getByText(`${nome} ×1`)).toBeVisible() // "Fica com ele"
      await pagina.getByRole('button', { name: 'Registrar devolução (1 item)' }).click()
      await expect(pagina.getByRole('heading', { name: 'Devolução registrada' })).toBeVisible()
      await expect(pagina.getByText('avariada · foi para manutenção')).toBeVisible()
    } finally {
      await navegador.close()
    }

    const unidades = await eng.get<{ status: string }[]>(`unidade?select=status&tipo_id=eq.${tipo}`)
    expect(unidades.map((u) => u.status).sort()).toEqual(['em_uso', 'manutencao'])
    const posses = await eng.get<unknown[]>(`posse?select=unidade_id&pessoa_id=eq.${pessoa}`)
    expect(posses.length).toBeGreaterThanOrEqual(1)
    const avarias = await eng.get<{ motivo: string; foto_path: string }[]>(
      `avaria?select=motivo,foto_path&order=criado_em.desc&limit=1`,
    )
    expect(avarias[0]?.motivo).toBe('cabo_rompido')
    expect(avarias[0]?.foto_path).toMatch(new RegExp(`^${OBRA}/[0-9a-f-]{36}\\.jpg$`))

    // Item retirado com QR, pedido pela lista (sem QR): a API bloqueia, não só a tela.
    const bloqueio = await alm.post('rpc/registrar_devolucao', {
      p_obra: OBRA,
      p_pessoa: pessoa,
      p_identificacao: null,
      p_itens: [{ tipo, quantidade: 1 }],
    })
    expect(bloqueio.status).toBe(400)
    expect((bloqueio.corpo as { code: string }).code).toBe('AL004')
  })

  test('item retirado sem QR volta sem QR pela lista', async ({ page, request }, info) => {
    const nome = `Colher dev ${info.project.name}-${Date.now() % 100000}`
    // Uma pessoa por projeto: "Devolveu tudo" levaria junto a peça do outro projeto.
    const [quem, busca] =
      info.project.name === 'iphone' ? ['Tiago Ramos', 'tiago'] : ['Sandro Melo', 'sandro']
    const { tipo, pessoa, eng } = await preparar(request, quem, nome, 1)
    const alm = await api(request, 'almoxarife')
    await alm.post('rpc/registrar_retirada', {
      p_obra: OBRA,
      p_pessoa: pessoa,
      p_identificacao: null,
      p_itens: [{ tipo, quantidade: 1 }],
      p_confirmado: true,
    })

    await entrarComo(page, 'almoxarife', '/inicio')
    await page.goto('/pessoas')
    await page.getByPlaceholder('Buscar pelo nome').fill(busca)
    await page.getByRole('link', { name: new RegExp(`^${quem}`) }).click()
    await page.getByRole('link', { name: 'Devolução' }).click()
    await expect(page.getByText('PEGOU SEM QR · PODE DEVOLVER SEM QR')).toBeVisible()
    await page.getByRole('region', { name: nome }).waitFor()
    await page.getByRole('button', { name: 'Devolveu tudo' }).click()
    await page.getByRole('button', { name: /^Registrar devolução/ }).click()
    await expect(page.getByRole('heading', { name: 'Devolução registrada' })).toBeVisible()
    await expect(page.getByText('de volta ao almoxarifado').first()).toBeVisible()
    const [u] = await eng.get<{ status: string }[]>(`unidade?select=status&tipo_id=eq.${tipo}`)
    expect(u?.status).toBe('livre')
  })

  test('engenheiro estorna uma devolução e conserta a peça avariada', async ({
    page,
    request,
  }, info) => {
    const nome = `Martelo dev ${info.project.name}-${Date.now() % 100000}`
    const { tipo, pessoa, eng } = await preparar(request, 'Sandro Melo', nome, 2)
    const alm = await api(request, 'almoxarife')
    await alm.post('rpc/registrar_retirada', {
      p_obra: OBRA,
      p_pessoa: pessoa,
      p_identificacao: null,
      p_itens: [{ tipo, quantidade: 1 }],
      p_confirmado: true,
    })
    const devolucao = (
      await alm.post('rpc/registrar_devolucao', {
        p_obra: OBRA,
        p_pessoa: pessoa,
        p_identificacao: null,
        p_itens: [{ tipo, quantidade: 1 }],
      })
    ).corpo as string

    // Estorno pela tela do lançamento, com motivo.
    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto(`/lancamento/${devolucao}`)
    await page.getByRole('button', { name: 'Estornar este lançamento' }).click()
    await page.getByLabel('Motivo').fill('Devolução lançada por engano')
    await page.getByRole('button', { name: 'Confirmar estorno' }).click()
    await expect(page.getByText(/Estornado em .*Devolução lançada por engano/)).toBeVisible()
    const [u] = await eng.get<{ status: string }[]>(
      `unidade?select=status&tipo_id=eq.${tipo}&status=neq.livre`,
    )
    expect(u?.status).toBe('em_uso') // voltou para o nome do Sandro

    // Peça avariada (foto enviada ao Storage): "Voltou do conserto" volta a livre.
    await eng.post('rpc/registrar_retirada', {
      p_obra: OBRA,
      p_pessoa: pessoa,
      p_identificacao: null,
      p_itens: [{ tipo, quantidade: 1 }],
      p_confirmado: true,
    })
    const foto = `${OBRA}/${crypto.randomUUID()}.jpg`
    const { url: u2, chave: k2 } = ambiente()
    const login = await request.post(`${u2}/auth/v1/token?grant_type=password`, {
      headers: { apikey: k2 },
      data: { email: USUARIOS.engenheiro, password: SENHA_SEED },
    })
    const jwt = ((await login.json()) as { access_token: string }).access_token
    await request.post(`${u2}/storage/v1/object/avarias/${foto}`, {
      headers: { apikey: k2, Authorization: `Bearer ${jwt}`, 'Content-Type': 'image/jpeg' },
      data: FOTO.buffer,
    })
    await eng.post('rpc/registrar_devolucao', {
      p_obra: OBRA,
      p_pessoa: pessoa,
      p_identificacao: null,
      p_itens: [{ tipo, quantidade: 1, avarias: [{ motivo: 'quebrada', foto }] }],
    })
    await page.goto('/manutencao')
    const linha = page
      .locator('div')
      .filter({ hasText: nome })
      .filter({ has: page.getByRole('button', { name: 'Voltou do conserto' }) })
      .last()
    await expect(linha.getByRole('img', { name: /Foto da avaria/ })).toBeVisible()
    await expect(linha.getByText('Quebrada')).toBeVisible()
    await linha.getByRole('button', { name: 'Voltou do conserto' }).click()
    await page.getByRole('button', { name: /^Confirmar: .* voltou$/ }).click()
    await expect(page.getByText(nome)).toHaveCount(0, { timeout: 10_000 })
    const emManutencao = await eng.get<unknown[]>(
      `unidade?select=id&tipo_id=eq.${tipo}&status=eq.manutencao`,
    )
    expect(emManutencao).toHaveLength(0)
  })
})
