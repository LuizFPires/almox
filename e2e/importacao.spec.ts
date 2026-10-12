import { expect, test, type APIRequestContext } from '@playwright/test'
import ExcelJS from 'exceljs'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

/** Preenche a planilha modelo baixada do app com as linhas do teste. */
async function preencher(modelo: string, linhas: Record<string, (string | number)[][]>) {
  const livro = new ExcelJS.Workbook()
  await livro.xlsx.readFile(modelo)
  for (const [aba, valores] of Object.entries(linhas)) {
    const planilha = livro.getWorksheet(aba)
    if (!planilha) throw new Error(`sem a aba ${aba}`)
    planilha.spliceRows(2, 1) // tira o exemplo
    valores.forEach((v, i) => {
      planilha.getRow(i + 2).values = v
    })
  }
  return Buffer.from(await livro.xlsx.writeBuffer())
}

async function engenheiro(request: APIRequestContext) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS.engenheiro, password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  return async <T>(caminho: string) =>
    (await (
      await request.get(`${url}/rest/v1/${caminho}`, {
        headers: { apikey: chave, Authorization: `Bearer ${jwt}` },
      })
    ).json()) as T
}

test.describe('importação do cadastro inicial', () => {
  test.skip(({ isMobile }) => !isMobile, 'telas do celular')
  test.skip(semSeed, 'precisa do seed')

  test('modelo → prévia com erro → corrige → importa empresa, pessoas e ferramenta', async ({
    page,
    request,
  }, info) => {
    const n = `${info.project.name}-${Date.now() % 100000}`
    const empresa = `Empreiteira Imp ${n}`
    const prefixo = Array.from({ length: 3 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join('')
    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto('/cadastros/pessoas')
    await page.getByRole('link', { name: /Importar planilha/ }).click()
    const baixando = page.waitForEvent('download')
    await page.getByRole('link', { name: 'Baixar planilha modelo (.xlsx)' }).click()
    const modelo = await (await baixando).path()

    const empresas = [[empresa, 'Empreiteira', 'Dono Imp', `dono-${n}@teste.exemplo`, '']]
    const ferramentas = [[`Betoneira ${n}`, 'Carrinho', prefixo, '4.500,00', '2', 'sim']]
    // Primeiro com um erro: pessoa sem sobrenome.
    const comErro = await preencher(modelo, {
      Empresas: empresas,
      Pessoas: [['Zé', '', 'Pedreiro', empresa]],
      Ferramentas: ferramentas,
    })
    await page.getByLabel('Planilha preenchida').setInputFiles({
      name: 'cadastro.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: comErro,
    })
    await page.getByRole('button', { name: 'Ver prévia' }).click()
    await expect(page.getByText('Pessoas, linha 2: Informe nome e sobrenome.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Importar tudo' })).toHaveCount(0)

    const certo = await preencher(modelo, {
      Empresas: empresas,
      Pessoas: [
        [`Joana Imp ${n}`, '', 'Servente', empresa],
        [`Caio Imp ${n}`, 'CAIO IMP', 'Pedreiro', empresa],
      ],
      Ferramentas: ferramentas,
    })
    await page.getByLabel('Planilha preenchida').setInputFiles({
      name: 'cadastro.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: certo,
    })
    await page.getByRole('button', { name: 'Ver prévia' }).click()
    await expect(page.getByRole('status')).toContainText(
      'Vai entrar: 1 empresa, 2 pessoas e 1 ferramenta (2 unidades).',
    )
    await page.getByRole('button', { name: 'Importar tudo' }).click()
    await expect(page.getByRole('heading', { name: 'Cadastro importado' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Imprimir 2 adesivos' })).toBeVisible()

    const get = await engenheiro(request)
    const pessoas = await get<{ nome_capacete: string; empresa: { nome: string } }[]>(
      `pessoa?select=nome_capacete,empresa:empresa!pessoa_empresa_id_obra_id_fkey(nome)&obra_id=eq.${OBRA}&nome=like.*Imp%20${encodeURIComponent(n)}`,
    )
    // Capacete sugerido: o primeiro nome, ou com a inicial se outro teste já usou esse nome.
    expect(pessoas.map((p) => p.nome_capacete).sort()).toEqual([
      'CAIO IMP',
      expect.stringMatching(/^JOANA( \S\.)?$/),
    ])
    expect(pessoas.every((p) => p.empresa.nome === empresa)).toBe(true)
    const tipos = await get<{ valor_reposicao: number; alto_valor: boolean }[]>(
      `tipo_ferramenta?select=valor_reposicao,alto_valor&nome=eq.${encodeURIComponent(`Betoneira ${n}`)}`,
    )
    expect(tipos).toEqual([{ valor_reposicao: 450000, alto_valor: true }])
  })

  test('almoxarife não baixa o modelo nem importa', async ({ page }) => {
    await entrarComo(page, 'almoxarife', '/inicio')
    expect((await page.request.get('/api/planilhas/modelo')).status()).toBe(403)
    await page.goto('/cadastros/importar')
    await expect(page.getByText('Só o engenheiro cadastra')).toBeVisible()
  })
})
