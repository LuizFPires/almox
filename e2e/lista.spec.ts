import { expect, test, type APIRequestContext } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'
import { CELULAR } from './camera'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

/** API com o login de um perfil do seed; falha com a mensagem do banco. */
async function api(request: APIRequestContext, perfil: keyof typeof USUARIOS) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS[perfil], password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}`, Prefer: 'return=representation' }
  const conferir = async <T>(r: Awaited<ReturnType<APIRequestContext['get']>>) => {
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  const get = async <T>(caminho: string) =>
    conferir<T>(await request.get(`${url}/rest/v1/${caminho}`, { headers }))
  const post = async <T>(caminho: string, data: unknown) =>
    conferir<T>(await request.post(`${url}/rest/v1/${caminho}`, { headers, data }))
  return { get, post }
}

/** Tipo novo com N unidades, só deste teste. */
async function criarFerramenta(request: APIRequestContext, nome: string, unidades: number) {
  const eng = await api(request, 'engenheiro')
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
  await eng.post('rpc/adicionar_unidades', { p_tipo: tipo?.id, p_quantidade: unidades })
  return { tipo: tipo?.id ?? '', prefixo }
}

/**
 * Retirada ou devolução de 1 peça com QR, feita pelo almoxarife em outro celular (API).
 * Todo teste devolve o que retirou, para não deixar pendência para o dia seguinte.
 */
async function lancar(
  request: APIRequestContext,
  tipoLancamento: 'retirada' | 'devolucao',
  nomePessoa: string,
  tipo: string,
) {
  const eng = await api(request, 'engenheiro')
  const [p] = await eng.get<{ id: string }[]>(
    `pessoa?select=id&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent(nomePessoa)}`,
  )
  const [adesivo] = await eng.post<{ token: string }[]>('rpc/dados_adesivo', { p_pessoa: p?.id })
  const alm = await api(request, 'almoxarife')
  const [conf] = await alm.post<{ identificacao: string }[]>('rpc/conferir_pessoa', {
    p_obra: OBRA,
    p_token: adesivo?.token,
  })
  const comum = {
    p_obra: OBRA,
    p_pessoa: p?.id,
    p_identificacao: conf?.identificacao,
    p_itens: [{ tipo, quantidade: 1 }],
  }
  if (tipoLancamento === 'retirada') {
    await alm.post('rpc/registrar_retirada', { ...comum, p_confirmado: true })
  } else {
    await alm.post('rpc/registrar_devolucao', comum)
  }
}

/**
 * Pessoas diferentes por projeto: os projetos rodam juntos, e uma conferência nova da mesma
 * pessoa invalida a anterior (a devolução de limpeza cairia em "sem QR").
 */
const PESSOAS = {
  android: { lista: 'Ivan Pereira', busca: ['José Carlos', 'jose'], outra: 'Edson Lima' },
  iphone: { lista: 'Renato Lima', busca: ['Antônio Ferreira', 'antonio'], outra: 'Osvaldo Cruz' },
} as const
const pessoas = (projeto: string) => PESSOAS[projeto === 'iphone' ? 'iphone' : 'android']

test.describe('lista e estoque', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do seed')

  test('retirada em outro celular atualiza lista e estoque sem recarregar', async ({
    page,
    browser,
    request,
    baseURL,
  }, info) => {
    const nome = `Régua lista ${info.project.name}-${Date.now() % 100000}`
    const { tipo, prefixo } = await criarFerramenta(request, nome, 2)
    const quem = pessoas(info.project.name).lista
    let retirou = false

    // Celular 1 (engenheiro): lista aberta. Celular 2: estoque aberto, linha do tipo novo expandida.
    await entrarComo(page, 'engenheiro', '/lista')
    const outro = await browser.newContext({ ...CELULAR, baseURL })
    try {
      const estoque = await outro.newPage()
      await entrarComo(estoque, 'engenheiro', '/estoque')
      const linha = estoque.getByRole('button', { name: new RegExp(`${nome}(?!\\d)`) })
      await expect(linha).toContainText('2 /2')
      await linha.click()
      const painel = estoque.locator(`#${await linha.getAttribute('aria-controls')}`)
      await expect(painel).toHaveText('Todas no almoxarifado')

      await lancar(request, 'retirada', quem, tipo)
      retirou = true

      await expect(page.getByText(`${prefixo}-01`)).toBeVisible({ timeout: 10_000 })
      await expect(linha).toContainText('1 /2', { timeout: 10_000 })
      await expect(painel).toContainText(new RegExp(`${prefixo}-01 · ${quem} · desde`))
    } finally {
      await outro.close()
      if (retirou) await lancar(request, 'devolucao', quem, tipo)
    }
  })

  test('busca sem acento e por código da peça', async ({ page, request }, info) => {
    const nome = `Régua busca ${info.project.name}-${Date.now() % 100000}`
    const { tipo, prefixo } = await criarFerramenta(request, nome, 1)
    const [quem, semAcento] = pessoas(info.project.name).busca
    await lancar(request, 'retirada', quem, tipo)
    try {
      await entrarComo(page, 'engenheiro', '/lista')
      const busca = page.getByPlaceholder('Buscar pessoa ou código da peça')
      const cartoes = page.locator('main a[href^="/pessoa/"]')

      await busca.fill(semAcento)
      await expect(cartoes).toHaveCount(1)
      await expect(cartoes).toContainText(quem)
      await expect(page.getByText(/sem ferramenta/)).toHaveCount(0)

      await busca.fill(`${prefixo.toLowerCase()}-01`)
      await expect(cartoes).toHaveCount(1)
      await expect(cartoes).toContainText(quem)
    } finally {
      await lancar(request, 'devolucao', quem, tipo)
    }
  })

  test('consulta da empreiteira vê só a própria empresa na lista', async ({ page }) => {
    await entrarComo(page, 'formas', '/lista')
    await expect(page.getByRole('region', { name: 'Fôrmas Ribeiro' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Construtora' })).toHaveCount(0)
    await expect(page.getByText('Raimundo Alves')).toHaveCount(0)
  })

  test('estoque da empreiteira acompanha retirada de outra empresa, sem o nome', async ({
    page,
    request,
  }, info) => {
    const nome = `Régua outras ${info.project.name}-${Date.now() % 100000}`
    const { tipo } = await criarFerramenta(request, nome, 2)
    const quem = pessoas(info.project.name).outra
    await entrarComo(page, 'formas', '/estoque')
    const linha = page.getByRole('button', { name: new RegExp(`${nome}(?!\\d)`) })
    await expect(linha).toContainText('2 /2')

    // A consulta da Fôrmas não vê o movimento da Construtora, mas o estoque muda.
    await lancar(request, 'retirada', quem, tipo)
    try {
      await expect(linha).toContainText('1 /2', { timeout: 10_000 })
      await linha.click()
      const painel = page.locator(`#${await linha.getAttribute('aria-controls')}`)
      await expect(painel).toHaveText('1 com outras empresas')
      await expect(page.getByText(quem)).toHaveCount(0)
    } finally {
      await lancar(request, 'devolucao', quem, tipo)
    }
  })
})
