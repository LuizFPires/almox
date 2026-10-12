import { expect, test, type APIRequestContext } from '@playwright/test'
import { ambiente, entrarComo, SENHA_SEED, semSeed, USUARIOS } from './apoio'

const OBRA = 'a0000000-0000-4000-8000-000000000001'
const MAILPIT = 'http://127.0.0.1:54424'

/** API com o login de um perfil do seed (falha com a mensagem do banco). */
async function api(request: APIRequestContext, perfil: keyof typeof USUARIOS) {
  const { url, chave } = ambiente()
  const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: chave },
    data: { email: USUARIOS[perfil], password: SENHA_SEED },
  })
  const jwt = ((await login.json()) as { access_token: string }).access_token
  const headers = { apikey: chave, Authorization: `Bearer ${jwt}`, Prefer: 'return=representation' }
  const ler = async <T>(r: Awaited<ReturnType<APIRequestContext['get']>>) => {
    const corpo = await r.text()
    expect(r.ok(), corpo).toBeTruthy()
    return (corpo ? JSON.parse(corpo) : null) as T
  }
  return {
    get: async <T>(c: string) => ler<T>(await request.get(`${url}/rest/v1/${c}`, { headers })),
    post: async <T>(c: string, data: unknown) =>
      ler<T>(await request.post(`${url}/rest/v1/${c}`, { headers, data })),
    patch: async (c: string, data: unknown) =>
      ler<unknown>(await request.patch(`${url}/rest/v1/${c}`, { headers, data })),
  }
}

/** E-mails na caixa de teste (Mailpit) para um endereço. */
async function emailsPara(request: APIRequestContext, endereco: string) {
  const r = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${endereco}"`)}`,
  )
  const corpo = (await r.json()) as { messages: { Subject: string }[] }
  return corpo.messages.map((m) => m.Subject)
}

/** Processa a fila de envios como o agendamento faria (o que não passou por uma tela). */
async function processarFila(request: APIRequestContext, baseURL: string) {
  const segredo = ambiente().segredoEnvios
  const r = await request.post(`${baseURL}/api/envios`, {
    headers: { Authorization: `Bearer ${segredo}` },
    data: {},
  })
  expect(r.ok(), await r.text()).toBeTruthy()
}

test.describe('fechamento do dia e avisos', () => {
  test.skip(({ isMobile, browserName }) => !isMobile || browserName !== 'chromium', 'um celular')
  test.skip(semSeed, 'precisa do seed e da caixa de e-mail de teste')

  test('2 empreiteiras com pendência: 2 avisos com o total certo, e-mail ao dono e ao encarregado; própria sem aviso; devolver cancela', async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(120_000)
    const eng = await api(request, 'engenheiro')
    const alm = await api(request, 'almoxarife')
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    )
    const jaEncerrado = await eng.get<unknown[]>(
      `fechamento_dia?select=id&obra_id=eq.${OBRA}&data=eq.${hoje}`,
    )
    // Um encerramento por dia: no CI o banco é novo; localmente, rode com o banco recriado.
    test.skip(jaEncerrado.length > 0, 'o dia já foi encerrado neste banco (npx supabase db reset)')

    const n = Date.now() % 1_000_000
    const sufixo = `${n}`
    const prefixo = Array.from({ length: 4 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join('')
    const [tipo] = await eng.post<{ id: string }[]>('tipo_ferramenta?select=id', {
      obra_id: OBRA,
      nome: `Prumo ${sufixo}`,
      icone: 'regua',
      prefixo,
      valor_reposicao: 12345,
    })
    await eng.post('rpc/adicionar_unidades', { p_tipo: tipo?.id, p_quantidade: 4 })

    // Duas empreiteiras do teste, cada uma com dono e encarregado (e-mails únicos) e uma pessoa.
    const empreiteiras: {
      nome: string
      dono: string
      encarregado: string
      empresa: string | undefined
      pessoa: string | undefined
    }[] = []
    for (const letra of ['A', 'B']) {
      const nome = `Empreiteira ${letra} ${sufixo}`
      const dono = `dono-${letra.toLowerCase()}-${sufixo}@teste.exemplo`
      const encarregado = `enc-${letra.toLowerCase()}-${sufixo}@teste.exemplo`
      const [empresa] = await eng.post<{ id: string }[]>('empresa?select=id', {
        obra_id: OBRA,
        nome,
        tipo: 'empreiteira',
        cor: '#7C3AED',
        dono_nome: `Dono ${letra}`,
        dono_email: dono,
        encarregado_email: encarregado,
      })
      const [pessoa] = await eng.post<{ id: string }[]>('pessoa?select=id', {
        obra_id: OBRA,
        empresa_id: empresa?.id,
        nome: `Trabalhador ${letra} ${sufixo}`,
        nome_capacete: `TRAB ${letra}`,
        funcao: 'Servente',
      })
      await eng.patch(`empresa?id=eq.${empresa?.id}&select=id`, {
        encarregado_pessoa_id: pessoa?.id,
      })
      empreiteiras.push({ nome, dono, encarregado, empresa: empresa?.id, pessoa: pessoa?.id })
    }
    // Retiradas sem QR (podem voltar sem QR): A leva 2, B leva 1.
    const retirar = (pessoa: string | undefined, quantidade: number) =>
      alm.post('rpc/registrar_retirada', {
        p_obra: OBRA,
        p_pessoa: pessoa,
        p_identificacao: null,
        p_itens: [{ tipo: tipo?.id, quantidade }],
        p_confirmado: true,
      })
    await retirar(empreiteiras[0]?.pessoa, 2)
    await retirar(empreiteiras[1]?.pessoa, 1)

    // Devolve o que sobrou mesmo se o teste falhar (senão vira pendência no próximo dia).
    const devolverSobra = async (pessoa: string | undefined, quantidade: number) => {
      const { url, chave } = ambiente()
      const login = await request.post(`${url}/auth/v1/token?grant_type=password`, {
        headers: { apikey: chave },
        data: { email: USUARIOS.almoxarife, password: SENHA_SEED },
      })
      const jwt = ((await login.json()) as { access_token: string }).access_token
      await request.post(`${url}/rest/v1/rpc/registrar_devolucao`, {
        headers: { apikey: chave, Authorization: `Bearer ${jwt}` },
        data: {
          p_obra: OBRA,
          p_pessoa: pessoa,
          p_identificacao: null,
          p_itens: [{ tipo: tipo?.id, quantidade }],
        },
      })
    }
    try {
      // Encerrar pela tela, como o almoxarife.
      await entrarComo(page, 'almoxarife', '/inicio')
      await page.goto('/fechamento')
      await expect(page.getByText(`Trabalhador A ${sufixo}`)).toBeVisible()
      await page.getByRole('button', { name: 'Encerrar o dia e enviar relatório' }).click()
      await expect(page.getByRole('heading', { name: 'Dia encerrado' })).toBeVisible()
      // Uma linha por empreiteira do teste, com o total a descontar. O Next deixa a tela anterior
      // escondida no DOM: só o que está visível.
      const linhaDe = (nome: string) =>
        page.getByRole('listitem').filter({ hasText: nome }).filter({ visible: true })
      await expect(linhaDe(`Empreiteira A ${sufixo}`)).toContainText('R$ 246,90 a descontar')
      await expect(linhaDe(`Empreiteira B ${sufixo}`)).toContainText('R$ 123,45 a descontar')

      // 2 avisos, total certo; a construtora (própria) não recebe aviso.
      const avisos = await eng.get<
        { total: number; status: string; empresa: { nome: string; tipo: string } }[]
      >(
        `aviso?select=total,status,empresa:empresa!aviso_empresa_id_obra_id_fkey(nome,tipo)` +
          `&obra_id=eq.${OBRA}&enviado_em=gte.${hoje}`,
      )
      const doTeste = avisos.filter((a) => a.empresa.nome.endsWith(sufixo))
      expect(doTeste.map((a) => [a.empresa.nome, a.total]).sort()).toEqual([
        [`Empreiteira A ${sufixo}`, 24690],
        [`Empreiteira B ${sufixo}`, 12345],
      ])
      expect(avisos.some((a) => a.empresa.tipo === 'propria')).toBe(false)

      // E-mail entregue ao dono e ao encarregado de cada uma.
      for (const e of empreiteiras) {
        for (const endereco of [e.dono, e.encarregado]) {
          await expect
            .poll(() => emailsPara(request, endereco), { timeout: 15_000 })
            .toContain(
              `Ferramentas não devolvidas · ${e.nome} · ${hoje.slice(8, 10)}/${hoje.slice(5, 7)}`,
            )
        }
      }

      // B devolve antes da medição: aviso cancelado e e-mail de cancelamento (RN-14).
      await alm.post('rpc/registrar_devolucao', {
        p_obra: OBRA,
        p_pessoa: empreiteiras[1]?.pessoa,
        p_identificacao: null,
        p_itens: [{ tipo: tipo?.id, quantidade: 1 }],
      })
      await processarFila(request, baseURL ?? '')
      const [avisoB] = await eng.get<{ status: string }[]>(
        `aviso?select=status&empresa_id=eq.${empreiteiras[1]?.empresa}`,
      )
      expect(avisoB?.status).toBe('cancelado')
      await expect
        .poll(() => emailsPara(request, empreiteiras[1]!.dono), { timeout: 15_000 })
        .toContainEqual(
          expect.stringMatching(new RegExp(`^Desconto cancelado · Empreiteira B ${sufixo}`)),
        )
    } finally {
      await devolverSobra(empreiteiras[0]?.pessoa, 2)
      await devolverSobra(empreiteiras[1]?.pessoa, 1)
    }
  })

  test('notificações: quem recebe aviso pode ativar; o almoxarife não vê', async ({
    browser,
    baseURL,
  }) => {
    for (const [perfil, ve] of [
      ['engenheiro', true],
      ['formas', true],
      ['almoxarife', false],
    ] as const) {
      const contexto = await browser.newContext({ baseURL })
      try {
        const pagina = await contexto.newPage()
        await entrarComo(pagina, perfil, '/inicio')
        await pagina.goto('/conta')
        await expect(pagina.getByRole('heading', { name: 'NOTIFICAÇÕES' })).toHaveCount(ve ? 1 : 0)
        if (ve) {
          // Ativar ou, sem serviço de push no navegador de teste, a explicação: nunca erro.
          await expect(
            pagina
              .getByRole('button', { name: 'Ativar notificações neste celular' })
              .or(pagina.getByText(/Este navegador não recebe notificações|Bloqueadas/)),
          ).toBeVisible()
        }
      } finally {
        await contexto.close()
      }
    }
  })
})
