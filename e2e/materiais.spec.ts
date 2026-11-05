import { expect, test, type APIRequestContext, type Locator } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'

const OBRA = 'a0000000-0000-4000-8000-000000000001'
const CIMENTO = 'Cimento CP-II 50 kg'
const BRITA = 'Brita 1'

/** API como engenheiro: deixa o saldo do material no ponto de partida do teste. */
async function apiEngenheiro(request: APIRequestContext) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS.engenheiro, password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}`, Prefer: 'return=representation' }
  const rpc = async <T>(nome: string, data: unknown) => {
    const r = await request.post(`${url}/rest/v1/rpc/${nome}`, { headers, data })
    const corpo = await r.text()
    expect(r.ok(), corpo).toBeTruthy()
    return (corpo ? JSON.parse(corpo) : null) as T
  }

  async function material(nome: string) {
    const r = await request.get(
      `${url}/rest/v1/material?select=id,saldo&obra_id=eq.${OBRA}&nome=eq.${encodeURIComponent(nome)}`,
      { headers },
    )
    expect(r.ok(), await r.text()).toBeTruthy()
    const [m] = (await r.json()) as { id: string; saldo: number }[]
    expect(m, `material ${nome} do seed`).toBeTruthy()
    return { id: m?.id ?? '', saldo: Number(m?.saldo) }
  }

  /**
   * Põe o saldo em `saldo` por uma contagem "ajustar" (o caminho de verdade do app): os testes
   * não dependem da ordem nem de rodar logo depois do `db reset`.
   */
  async function deixarSaldo(nome: string, saldo: number) {
    const m = await material(nome)
    if (m.saldo !== saldo) {
      await rpc('registrar_contagem_material', {
        p_obra: OBRA,
        p_modo: 'ajustar',
        p_itens: [{ material: m.id, saldo_visto: m.saldo, contado: saldo }],
      })
    }
    return m.id
  }

  async function saida(materialId: string, quantidade: number) {
    return rpc<string>('registrar_saida_material', {
      p_obra: OBRA,
      p_material: materialId,
      p_quantidade: quantidade,
    })
  }

  return { material, deixarSaldo, saida }
}

test.describe('materiais: lançamentos', () => {
  // Mexem no saldo dos materiais do seed: um celular só e um teste por vez.
  test.skip(
    ({ isMobile, browserName }) => !isMobile || browserName !== 'chromium',
    'um celular (saldo compartilhado)',
  )
  test.skip(semSeed, 'precisa do seed')
  test.describe.configure({ mode: 'default' })

  test('almoxarife: saída de 100 sacos em até 5 toques, cruza o limite e avisa a obra', async ({
    page,
    request,
  }) => {
    const eng = await apiEngenheiro(request)
    await eng.deixarSaldo(CIMENTO, 118)

    await entrarComo(page, 'almoxarife', '/materiais')
    let toques = 0
    const tocar = async (alvo: Locator) => {
      await alvo.click()
      toques++
    }
    await tocar(page.getByRole('link', { name: 'Saída', exact: true }))
    await tocar(page.getByRole('button', { name: new RegExp(CIMENTO) }))
    const gaveta = page.getByRole('dialog')
    await tocar(gaveta.getByRole('button', { name: '+50', exact: true }))
    await tocar(gaveta.getByRole('button', { name: '+50', exact: true }))
    await expect(gaveta.getByText('Fica abaixo do limite de 20')).toBeVisible()
    await tocar(gaveta.getByRole('button', { name: 'Registrar saída' }))

    await expect(page.getByRole('heading', { name: 'Saída registrada' })).toBeVisible()
    await expect(page.getByText('Saldo: 18 sc')).toBeVisible()
    await expect(page.getByText('Aviso enviado a todos da obra')).toBeVisible()
    expect(toques).toBeLessThanOrEqual(5)
  })

  test('almoxarife: entrada digitada com milhar ("1.500") passa pela conferência', async ({
    page,
    request,
  }) => {
    const eng = await apiEngenheiro(request)
    await eng.deixarSaldo(BRITA, 14)

    await entrarComo(page, 'almoxarife', '/materiais')
    await page.getByRole('link', { name: 'Entrada', exact: true }).click()
    await page.getByRole('button', { name: new RegExp(BRITA) }).click()
    const gaveta = page.getByRole('dialog')
    await gaveta.getByLabel('Quantidade').fill('1.500')
    await expect(gaveta.getByText('Saldo: 14 → 1.514 m³')).toBeVisible()
    await gaveta.getByRole('button', { name: 'Continuar' }).click()
    await expect(gaveta.getByText('+1.500 m³')).toBeVisible()
    await gaveta.getByRole('button', { name: 'Confirmar entrada' }).click()

    await expect(page.getByRole('heading', { name: 'Entrada registrada' })).toBeVisible()
    await expect(page.getByText('Saldo: 1.514 m³')).toBeVisible()
  })

  test('almoxarife: contagem "só conferir" registra a divergência sem mexer no saldo', async ({
    page,
    request,
  }) => {
    const eng = await apiEngenheiro(request)
    const cimento = await eng.deixarSaldo(CIMENTO, 18)

    await entrarComo(page, 'almoxarife', '/materiais')
    await page.getByRole('link', { name: 'Contagem', exact: true }).click()
    await page.getByLabel(`Contei de ${CIMENTO}`).fill('15')
    await page.getByRole('button', { name: 'Revisar contagem' }).click()
    await expect(page.getByText('sistema 18 · contei 15')).toBeVisible()
    await page.getByRole('radio', { name: /Só conferir/ }).click()
    await page.getByRole('button', { name: 'Confirmar contagem' }).click()
    await expect(page.getByText('Contagem salva')).toBeVisible()

    await page.getByRole('link', { name: 'Ver extrato' }).click()
    const linha = page.getByRole('listitem').filter({ hasText: CIMENTO }).first()
    await expect(linha).toContainText('Conferência · divergência')
    await expect(linha).toContainText('−3')

    await page.goto(`/materiais/${cimento}`)
    await expect(page.getByRole('region', { name: 'Saldo' })).toContainText('18 sc')
    expect((await eng.material(CIMENTO)).saldo).toBe(18)
  })

  test('engenheiro: edita a saída de −100 para −90; o extrato guarda o valor antigo', async ({
    page,
    request,
  }) => {
    const eng = await apiEngenheiro(request)
    const cimento = await eng.deixarSaldo(CIMENTO, 118)
    await eng.saida(cimento, 100)

    await entrarComo(page, 'engenheiro', '/materiais')
    await page.goto(`/materiais/${cimento}`)
    await expect(page.getByRole('region', { name: 'Saldo' })).toContainText('18 sc')
    // Extrato do mais novo para o mais antigo: a primeira saída é a que este teste lançou.
    const linha = page.getByRole('listitem').filter({ hasText: 'Saída' }).first()
    await expect(linha).toContainText('−100')
    await linha.getByRole('button', { name: `Editar lançamento de ${CIMENTO}` }).click()
    const gaveta = page.getByRole('dialog')
    await expect(gaveta.getByLabel('Quantidade')).toHaveValue('100')
    await gaveta.getByLabel('Quantidade').fill('90')
    await gaveta.getByRole('button', { name: 'Salvar' }).click()
    await expect(gaveta).toHaveCount(0)

    await expect(linha).toContainText('(era −100)')
    await expect(linha).toContainText('−90')
    await expect(page.getByRole('region', { name: 'Saldo' })).toContainText('28 sc')
  })
})

test.describe('materiais: consulta e chave de modo', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do seed')

  test('mestre (consulta) vê os saldos e não vê Entrada, Saída nem Contagem', async ({ page }) => {
    await entrarComo(page, 'mestre', '/materiais')
    await expect(page.getByRole('heading', { name: 'Saldo agora' })).toBeVisible()
    for (const nome of ['Entrada', 'Saída', 'Contagem']) {
      await expect(page.getByRole('link', { name: nome, exact: true })).toHaveCount(0)
    }

    await page.goto('/materiais/saldos')
    await expect(page.getByRole('heading', { name: 'Saldos' })).toBeVisible()
    await expect(page.getByText(CIMENTO)).toBeVisible()
    await expect(page.getByText('Arame recozido 18')).toBeVisible()

    // Pela URL também não lança: a tela de saída devolve para o início de materiais.
    await page.goto('/materiais/saida')
    await expect(page).toHaveURL(/\/materiais$/)
  })

  test('a chave volta para Ferramentas: Início com "Ler QR do capacete"', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/materiais')
    await page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Ferramentas' }).click()
    await expect(page).toHaveURL(/\/inicio$/)
    await expect(page.getByText('Ler QR do capacete')).toBeVisible()
    await expect(
      page.getByRole('group', { name: 'Modo' }).getByRole('button', { name: 'Ferramentas' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
