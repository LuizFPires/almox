import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'
import { CELULAR, navegadorComQr } from './camera'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

/** API como engenheiro: cria ferramentas próprias do teste e confere o banco. */
async function apiEngenheiro(request: APIRequestContext) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS.engenheiro, password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}`, Prefer: 'return=representation' }
  const get = async <T>(caminho: string) =>
    (await (await request.get(`${url}/rest/v1/${caminho}`, { headers })).json()) as T
  const post = async <T>(caminho: string, data: unknown) =>
    (await (await request.post(`${url}/rest/v1/${caminho}`, { headers, data })).json()) as T

  /** Tipo novo com N unidades, só deste teste (não gasta as do seed). */
  async function criarFerramenta(nome: string, icone: string, unidades: number) {
    const prefixo = Array.from({ length: 4 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join('')
    const [tipo] = await post<{ id: string }[]>('tipo_ferramenta', {
      obra_id: OBRA,
      nome,
      icone,
      prefixo,
      valor_reposicao: 10000,
    })
    await post('rpc/adicionar_unidades', { p_tipo: tipo?.id, p_quantidade: unidades })
    return tipo?.id ?? ''
  }

  async function pessoa(nome: string) {
    const [p] = await get<{ id: string }[]>(
      `pessoa?select=id&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent(nome)}`,
    )
    const [d] = await post<{ token: string }[]>('rpc/dados_adesivo', { p_pessoa: p?.id })
    return { id: p?.id ?? '', token: d?.token ?? '' }
  }

  /**
   * A retirada que levou as peças destes tipos (criados só por este teste). Não use "a última
   * retirada da pessoa": os projetos do celular rodam juntos e lançam para as mesmas pessoas.
   */
  async function retiradaDosTipos(pessoaId: string, tipos: string[]) {
    const itens = await get<{ movimento_id: string }[]>(
      `movimento_item?select=movimento_id,unidade:unidade!movimento_item_unidade_id_obra_id_fkey!inner(tipo_id)` +
        `&unidade.tipo_id=in.(${tipos.join(',')})`,
    )
    const ids = [...new Set(itens.map((i) => i.movimento_id))]
    const [m] = await get<{ id: string; via: string; usuario_id: string }[]>(
      `movimento?select=id,via,usuario_id&id=in.(${ids.join(',')})` +
        `&pessoa_id=eq.${pessoaId}&tipo=eq.retirada&order=criado_em.desc&limit=1`,
    )
    return m && { ...m, itens: itens.filter((i) => i.movimento_id === m.id) }
  }

  async function emUso(tipoId: string) {
    return (await get<unknown[]>(`unidade?select=id&tipo_id=eq.${tipoId}&status=eq.em_uso`)).length
  }

  return { criarFerramenta, pessoa, retiradaDosTipos, emUso }
}

/** Toca `vezes` no ícone da ferramenta na grade. */
async function tocar(pagina: Page, nome: string, vezes: number) {
  for (let i = 0; i < vezes; i++) {
    await pagina.getByRole('button', { name: new RegExp(`^${nome}:`) }).click()
  }
}

async function concluirComConferencia(pagina: Page, total: number) {
  await pagina
    .getByRole('button', { name: `Continuar (${total} ${total === 1 ? 'item' : 'itens'})` })
    .click()
  await pagina.getByRole('checkbox').click()
  await pagina.getByRole('button', { name: 'Concluir retirada' }).click()
}

test.describe('retirada', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do seed')
  test.describe.configure({ mode: 'serial' })

  test('2 pás + 1 furadeira com QR: 3 em uso, posse qr, movimento do almoxarife, Início ao vivo', async ({
    browserName,
    request,
    page,
    baseURL,
  }, info) => {
    test.skip(browserName !== 'chromium', 'câmera falsa do Chromium')
    const api = await apiEngenheiro(request)
    const sufixo = `${info.project.name}-${Date.now() % 100000}`
    const pa = await api.criarFerramenta(`Pá ${sufixo}`, 'pa', 3)
    const furadeira = await api.criarFerramenta(`Furadeira ${sufixo}`, 'furadeira', 2)
    const wagner = await api.pessoa('Wagner Pinto')

    // Outro celular (engenheiro) olhando o Início: a retirada tem que aparecer sozinha.
    await entrarComo(page, 'engenheiro', '/inicio')
    const ultimos = page.getByRole('region', { name: 'ÚLTIMOS LANÇAMENTOS' })
    const antes = await ultimos.innerText()
    // Marca a página: se ela recarregar, a marca some.
    await page.evaluate(() => Object.assign(window, { semRecarregar: true }))

    const navegador = await navegadorComQr(wagner.token)
    try {
      const pagina = await navegador.newPage({ ...CELULAR, baseURL })
      await entrarComo(pagina, 'almoxarife', '/inicio')
      await pagina.goto('/leitura')
      await pagina.getByRole('button', { name: 'Sim, é o Wagner' }).click({ timeout: 15_000 })
      await pagina.getByRole('link', { name: 'Retirada' }).click()
      await expect(pagina.getByText('CADA TOQUE NO ÍCONE SOMA 1')).toBeVisible()
      await tocar(pagina, `Pá ${sufixo}`, 2)
      await tocar(pagina, `Furadeira ${sufixo}`, 1)
      await concluirComConferencia(pagina, 3)
      await expect(pagina.getByRole('heading', { name: 'Retirada registrada' })).toBeVisible()
      await expect(pagina.getByText(`Pá ${sufixo} ×2`)).toBeVisible()
      await expect(pagina.getByText('com Wagner · QR conferido').first()).toBeVisible()
    } finally {
      await navegador.close()
    }

    const mov = await api.retiradaDosTipos(wagner.id, [pa, furadeira])
    expect(mov?.via).toBe('qr')
    expect(mov?.usuario_id).toBe('b0000000-0000-4000-8000-000000000002')
    expect(mov?.itens).toHaveLength(3)
    expect(await api.emUso(pa)).toBe(2)
    expect(await api.emUso(furadeira)).toBe(1)
    // Ao vivo: a lista mudou sem recarregar. Não dá para exigir a linha do Wagner: o Início
    // mostra só os 5 últimos e os outros testes lançam ao mesmo tempo.
    await expect.poll(() => ultimos.innerText(), { timeout: 10_000 }).not.toBe(antes)
    expect(await page.evaluate(() => 'semRecarregar' in window)).toBe(true)
  })

  test('dois celulares na última furadeira: só um leva, o outro recebe "acabou de sair"', async ({
    browser,
    request,
    baseURL,
  }, info) => {
    const api = await apiEngenheiro(request)
    const nome = `Furadeira única ${info.project.name}-${Date.now() % 100000}`
    const tipo = await api.criarFerramenta(nome, 'furadeira', 1)
    const helio = await api.pessoa('Hélio Moreira')
    const paulo = await api.pessoa('Paulo Ribeiro')

    const celulares = await Promise.all(
      [
        ['almoxarife', helio.id],
        ['engenheiro', paulo.id],
      ].map(async ([perfil, pessoaId]) => {
        const contexto = await browser.newContext({ ...CELULAR, baseURL })
        const pagina = await contexto.newPage()
        await entrarComo(pagina, perfil as 'almoxarife' | 'engenheiro', '/inicio')
        await pagina.goto(`/pessoa/${pessoaId}/retirada?via=manual`)
        await tocar(pagina, nome, 1)
        await pagina.getByRole('button', { name: 'Continuar (1 item)' }).click()
        await pagina.getByRole('checkbox').click()
        return { contexto, pagina }
      }),
    )
    try {
      // Os dois tocam "Concluir" juntos.
      await Promise.all(
        celulares.map(({ pagina }) =>
          pagina.getByRole('button', { name: 'Concluir retirada' }).click(),
        ),
      )
      const resultados = await Promise.all(
        celulares.map(async ({ pagina }) => {
          const ok = pagina.getByRole('heading', { name: 'Retirada registrada' })
          const acabou = pagina.getByText(`${nome} acabou de sair`)
          await expect(ok.or(acabou)).toBeVisible({ timeout: 15_000 })
          return (await ok.isVisible()) ? 'levou' : 'acabou'
        }),
      )
      expect(resultados.sort()).toEqual(['acabou', 'levou'])
      expect(await api.emUso(tipo)).toBe(1)
    } finally {
      await Promise.all(celulares.map(({ contexto }) => contexto.close()))
    }
  })

  test('retirada pela lista (sem QR) grava via = manual', async ({ page, request }, info) => {
    const api = await apiEngenheiro(request)
    const nome = `Colher ${info.project.name}-${Date.now() % 100000}`
    const colher = await api.criarFerramenta(nome, 'colher', 2)
    const helio = await api.pessoa('Hélio Moreira')

    await entrarComo(page, 'almoxarife', '/inicio')
    await page.goto('/pessoas')
    await page.getByPlaceholder('Buscar pelo nome').fill('helio')
    await page.getByRole('link', { name: /^Hélio Moreira/ }).click()
    await expect(page.getByText('Escolhido na lista · sem QR')).toBeVisible()
    await page.getByRole('link', { name: 'Retirada' }).click()
    await tocar(page, nome, 1)
    await page.getByRole('button', { name: 'Continuar (1 item)' }).click()
    await expect(page.getByText(/Lançamento sem QR/)).toBeVisible()
    await page.getByRole('checkbox').click()
    await page.getByRole('button', { name: 'Concluir retirada' }).click()
    await expect(page.getByText('com Hélio · manual, sem QR')).toBeVisible()
    expect((await api.retiradaDosTipos(helio.id, [colher]))?.via).toBe('manual')
  })
})
