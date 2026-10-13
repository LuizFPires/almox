import { readFileSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'
import { aguardarLeitura, CELULAR, navegadorComQr } from './camera'

const ENGENHEIRO = 'b0000000-0000-4000-8000-000000000001'
const ALMOXARIFE = 'b0000000-0000-4000-8000-000000000002'
const MAILPIT = 'http://127.0.0.1:54424'
const FOTO = {
  name: 'avaria.png',
  mimeType: 'image/png',
  buffer: readFileSync('public/icones/icone-512.png'),
}

/** Campo pelo rótulo, só na tela visível (o Next mantém telas anteriores escondidas). */
const campo = (page: Page, rotulo: string) =>
  page.getByLabel(rotulo, { exact: true }).filter({ visible: true })

/**
 * Obra nova só deste teste (o app não cria obra: é cadastro do administrador), com o engenheiro
 * e o almoxarife do seed. O nome começa com "Zz" para não virar a obra padrão de ninguém.
 */
async function criarObra(request: APIRequestContext, nome: string): Promise<string> {
  const { url, chaveSecreta } = ambiente()
  const headers = {
    apikey: chaveSecreta,
    Authorization: `Bearer ${chaveSecreta}`,
    Prefer: 'return=representation',
  }
  const r = await request.post(`${url}/rest/v1/obra?select=id`, { headers, data: { nome } })
  expect(r.ok(), await r.text()).toBeTruthy()
  const [obra] = (await r.json()) as { id: string }[]
  const v = await request.post(`${url}/rest/v1/usuario_obra`, {
    headers,
    data: [
      { usuario_id: ENGENHEIRO, obra_id: obra?.id, perfil: 'engenheiro' },
      { usuario_id: ALMOXARIFE, obra_id: obra?.id, perfil: 'almoxarife' },
    ],
  })
  expect(v.ok(), await v.text()).toBeTruthy()
  return obra?.id ?? ''
}

/** No fim, a obra do teste sai de cena (fora do encerramento automático e dos outros testes). */
async function desativarObra(request: APIRequestContext, obra: string) {
  const { url, chaveSecreta } = ambiente()
  await request.patch(`${url}/rest/v1/obra?id=eq.${obra}`, {
    headers: { apikey: chaveSecreta, Authorization: `Bearer ${chaveSecreta}` },
    data: { ativa: false },
  })
}

async function usarObra(page: Page, nome: string) {
  await page.goto('/conta')
  await page.getByRole('button', { name: new RegExp(nome) }).click()
  await page.waitForURL((u) => u.pathname === '/inicio')
  await expect(page.getByText(new RegExp(`^${nome} ·`))).toBeVisible()
}

test.describe('fluxo completo', () => {
  test.skip(
    ({ browserName, isMobile }) => !isMobile || browserName !== 'chromium',
    'câmera falsa do Chromium',
  )
  test.skip(semSeed, 'precisa do seed e da caixa de e-mail de teste')

  test('cadastro → adesivo → retirada → devolução com avaria → fechamento → aviso', async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(180_000)
    const n = Date.now() % 1_000_000
    const obraNome = `Zz Fluxo ${n}`
    const obra = await criarObra(request, obraNome)
    try {
      const empresa = `Fôrmas Fluxo ${n}`
      const dono = `dono-fluxo-${n}@teste.exemplo`
      const ferramenta = `Serra Fluxo ${n}`
      const pessoa = `Zeca Fluxo ${n}`

      // Engenheiro: empresa, ferramenta com 2 unidades e pessoa com adesivo.
      await entrarComo(page, 'engenheiro', '/inicio')
      await usarObra(page, obraNome)
      await page.goto('/cadastros/empresa/nova')
      await campo(page, 'Nome da empresa').fill(empresa)
      await campo(page, 'Nome').fill('Dono Fluxo')
      await campo(page, 'E-mail').fill(dono)
      await page.getByRole('button', { name: 'Salvar empresa' }).click()
      await page.waitForURL((u) => u.pathname === '/cadastros/empresas')

      await page.goto('/cadastros/ferramenta/nova')
      await page.locator('label').filter({ hasText: 'Serra circular' }).first().click()
      await campo(page, 'Nome').fill(ferramenta)
      await campo(page, 'Valor de reposição (por unidade)').fill('450,00')
      await page.getByRole('button', { name: 'Aumentar unidade' }).click()
      await page.getByRole('button', { name: 'Salvar 2 unidades' }).click()
      await page.waitForURL((u) => u.pathname === '/cadastros/ferramentas')

      await page.goto('/cadastros/pessoa/nova')
      await campo(page, 'Nome completo').fill(pessoa)
      await page.getByText('Pedreiro', { exact: true }).click()
      await page.locator('label').filter({ hasText: empresa }).click()
      await page.getByRole('button', { name: 'Salvar e imprimir adesivo' }).click()
      await page.waitForURL((u) => u.pathname.endsWith('/imprimir'))
      await expect(page.getByRole('figure', { name: /Prévia do adesivo/ })).toBeVisible()

      // Token do capacete novo (o que o adesivo leva no QR).
      const { url, chave } = ambiente()
      const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
        headers: { apikey: chave },
        data: { email: USUARIOS.engenheiro, password: SENHA_SEED },
      })
      const jwt = ((await login.json()) as { access_token: string }).access_token
      const headers = { apikey: chave, Authorization: `Bearer ${jwt}` }
      const [p] = (await (
        await request.get(
          `${url}/rest/v1/pessoa?select=id&obra_id=eq.${obra}&nome=eq.${encodeURIComponent(pessoa)}`,
          { headers },
        )
      ).json()) as { id: string }[]
      const [adesivo] = (await (
        await request.post(`${url}/rest/v1/rpc/dados_adesivo`, {
          headers,
          data: { p_pessoa: p?.id },
        })
      ).json()) as { token: string }[]
      expect(adesivo?.token).toMatch(/^[0-9a-f]{16,}$/)

      // Almoxarife no celular: lê o capacete, retira 2, devolve 1 avariada, encerra o dia.
      const navegador = await navegadorComQr(adesivo?.token ?? '')
      try {
        const cel = await navegador.newPage({ ...CELULAR, baseURL })
        await entrarComo(cel, 'almoxarife', '/inicio')
        await usarObra(cel, obraNome)
        const primeiro = pessoa.split(' ')[0]

        await cel.goto('/leitura')
        const sim = cel.getByRole('button', { name: `Sim, é o ${primeiro}` })
        await aguardarLeitura(cel, sim)
        await sim.click()
        await cel.getByRole('link', { name: 'Retirada' }).click()
        const icone = cel.getByRole('button', { name: new RegExp(`^${ferramenta}:`) })
        await icone.click()
        await icone.click()
        await cel.getByRole('button', { name: 'Continuar (2 itens)' }).click()
        await cel.getByRole('checkbox').click()
        await cel.getByRole('button', { name: 'Concluir retirada' }).click()
        await expect(cel.getByRole('heading', { name: 'Retirada registrada' })).toBeVisible()

        await cel.goto('/leitura')
        const sim2 = cel.getByRole('button', { name: `Sim, é o ${primeiro}` })
        await aguardarLeitura(cel, sim2)
        await sim2.click()
        await cel.getByRole('link', { name: 'Devolução' }).click()
        const cartao = cel.getByRole('region', { name: ferramenta })
        await cartao.getByRole('button', { name: `Devolver mais uma ${ferramenta}` }).click()
        await cartao.getByRole('button', { name: `Mais uma: avariadas ${ferramenta}` }).click()
        await cartao.getByRole('button', { name: 'Fotografar a avaria' }).click()
        await cel.getByLabel(/Fotografar a avaria da/).setInputFiles(FOTO)
        await cel.getByText('Quebrada', { exact: true }).click()
        await cel.getByRole('button', { name: 'Usar esta foto' }).click()
        await expect(cartao.getByText('Foto anexada')).toBeVisible({ timeout: 15_000 })
        await cel.getByRole('button', { name: 'Registrar devolução (1 item)' }).click()
        await expect(cel.getByRole('heading', { name: 'Devolução registrada' })).toBeVisible()
        await expect(cel.getByText('avariada · foi para manutenção')).toBeVisible()

        await cel.goto('/fechamento')
        await expect(cel.getByText(pessoa)).toBeVisible()
        await cel.getByRole('button', { name: 'Encerrar o dia e enviar relatório' }).click()
        await cel.getByRole('button', { name: 'Sim, encerrar' }).click()
        await expect(cel.getByRole('heading', { name: 'Dia encerrado' })).toBeVisible()
        await expect(
          cel.getByRole('listitem').filter({ hasText: empresa }).filter({ visible: true }),
        ).toContainText('R$ 450,00 a descontar')
      } finally {
        await navegador.close()
      }

      // Aviso por e-mail ao dono da empreiteira, com a peça que não voltou.
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
        new Date(),
      )
      await expect
        .poll(
          async () => {
            const r = await request.get(
              `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${dono}"`)}`,
            )
            return ((await r.json()) as { messages: { Subject: string }[] }).messages.map(
              (m) => m.Subject,
            )
          },
          { timeout: 20_000 },
        )
        .toContain(
          `Ferramentas não devolvidas · ${empresa} · ${hoje.slice(8, 10)}/${hoje.slice(5, 7)}`,
        )
    } finally {
      await desativarObra(request, obra)
    }
  })
})
