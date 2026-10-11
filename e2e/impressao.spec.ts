import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type AddressInfo, type Server } from 'node:net'
import { expect, test, type Page } from '@playwright/test'
import { entrarComo, semSeed } from './apoio'

/** Campo pelo rótulo, só na tela visível (o Next mantém telas anteriores escondidas). */
const campo = (page: Page, rotulo: string) =>
  page.getByLabel(rotulo, { exact: true }).filter({ visible: true })

/** Impressora de mentira na porta RAW: guarda o que chega (o simulador do agente faz o mesmo). */
function impressoraFalsa(recebidas: string[]): Promise<Server> {
  const servidor = createServer((socket) => {
    const partes: Buffer[] = []
    socket.on('data', (d) => partes.push(d))
    socket.on('end', () => {
      recebidas.push(Buffer.concat(partes).toString('utf8'))
      socket.end()
    })
    socket.on('error', () => socket.destroy())
  })
  return new Promise((r) => servidor.listen(0, '127.0.0.1', () => r(servidor)))
}

// Mexe na impressora e no mini PC da obra: um projeto só, em série.
test.describe.configure({ mode: 'serial' })

test.describe('impressão do adesivo', () => {
  test.skip(({ browserName, isMobile }) => !isMobile || browserName !== 'chromium', 'só no android')
  test.skip(semSeed, 'precisa dos usuários do seed e do agente local')

  let simulador: Server | undefined
  let agente: ChildProcess | undefined
  const recebidas: string[] = []

  test.afterAll(async () => {
    agente?.kill()
    await new Promise((r) => (simulador ? simulador.close(r) : r(null)))
  })

  test('cadastro → fila → agente → impressora: sai em segundos com QR só do token', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    simulador = await impressoraFalsa(recebidas)
    const { port } = simulador.address() as AddressInfo

    await entrarComo(page, 'engenheiro', '/inicio')
    await page.goto('/cadastros/impressora')
    await campo(page, 'IP na rede da obra').fill('127.0.0.1')
    await campo(page, 'Porta').fill(String(port))
    await page.getByText('ZPL (Zebra)').click()
    await page.getByRole('button', { name: 'Salvar impressora' }).click()
    await expect(page.getByText('Impressora salva.')).toBeVisible()

    // Mini PC: o token aparece uma vez, já no formato do .env do agente.
    await page.getByRole('button', { name: /Cadastrar mini PC/ }).click()
    const env = await page.getByLabel('Configuração do agente').innerText()
    const valores = Object.fromEntries(
      env.split('\n').map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    ) as Record<string, string>
    expect(valores.ALMOX_TOKEN_DISPOSITIVO).toMatch(/^[0-9a-f]{64}$/)

    agente = spawn(process.execPath, ['agente-impressao/src/agente.ts'], {
      env: { ...process.env, ...valores, ALMOX_INTERVALO_MS: '1000' },
      stdio: 'ignore',
    })
    await page.reload()
    await expect(page.getByText('Agente online')).toBeVisible({ timeout: 15_000 })

    // Nova pessoa com "Salvar e imprimir adesivo".
    const nome = `Rui ${Date.now() % 100000} Prado`
    await page.goto('/cadastros/pessoa/nova')
    await campo(page, 'Nome completo').fill(nome)
    await page.getByText('Pedreiro', { exact: true }).click()
    await page.locator('label').filter({ hasText: 'Construtora' }).first().click()
    const inicio = Date.now()
    await page.getByRole('button', { name: 'Salvar e imprimir adesivo' }).click()
    await expect(page.getByText('Pessoa salva. Adesivo mandado para a impressora.')).toBeVisible()
    await expect(page.getByText(/Impresso no almoxarifado/)).toBeVisible({ timeout: 15_000 })
    expect(Date.now() - inicio).toBeLessThan(10_000 + 3_000) // critério: até 10 s (+ atualização da tela)

    // O que chegou na impressora: QR só com o token, nome só no texto.
    const adesivo = recebidas.find((r) => r.includes(nome))
    expect(adesivo).toBeDefined()
    const qr = /\^BQN,2,10\^FDMA,([^^]*)\^FS/.exec(adesivo ?? '')?.[1]
    expect(qr).toMatch(/^[0-9a-f]{16,64}$/)

    // Impressora desligada: o trabalho vira erro com mensagem clara.
    await new Promise((r) => simulador?.close(r))
    simulador = undefined
    await page.getByRole('button', { name: 'Reimprimir' }).click()
    await expect(page.getByText(/Impressora sem resposta: recusou a conexão/)).toBeVisible({
      timeout: 15_000,
    })

    // Desliga o mini PC de teste.
    agente.kill()
    await page.goto('/cadastros/impressora')
    const revogar = page.getByRole('button', { name: 'Revogar' })
    while ((await revogar.count()) > 0) {
      const antes = await revogar.count()
      await revogar.first().click()
      await expect(revogar).toHaveCount(antes - 1)
    }
  })
})
