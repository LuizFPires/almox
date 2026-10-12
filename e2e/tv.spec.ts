import { expect, test, type APIRequestContext } from '@playwright/test'
import { ambiente, SENHA_SEED, semSeed, USUARIOS } from './apoio'

const OBRA = 'a0000000-0000-4000-8000-000000000001'

/** API como engenheiro (falha com a mensagem do banco). */
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
  const get = async <T>(caminho: string) => {
    const r = await request.get(`${url}/rest/v1/${caminho}`, { headers })
    expect(r.ok(), await r.text()).toBeTruthy()
    return (await r.json()) as T
  }
  return { rpc, get }
}

test.describe('painel da TV', () => {
  test.skip(({ isMobile }) => isMobile, 'tela da TV')
  test.skip(semSeed, 'precisa do seed')

  test('conecta pelo link do dispositivo, tira o token da URL e para ao revogar', async ({
    page,
    request,
  }, info) => {
    const eng = await apiEngenheiro(request)
    const nome = `TV e2e ${info.project.name}-${Date.now() % 100000}`
    const token = await eng.rpc<string>('criar_dispositivo', { p_obra: OBRA, p_nome: nome })

    await page.goto('/tv')
    await expect(page.getByText('Dispositivo não autorizado')).toBeVisible()

    await page.goto(`/tv/entrar?t=${token}`)
    await expect(page).toHaveURL(/\/tv$/)
    await expect(page.getByText('Obra Demonstração')).toBeVisible()
    const dados = await page.request.get('/tv/dados')
    expect(dados.status()).toBe(200)
    expect(((await dados.json()) as { obra: string }).obra).toBe('Obra Demonstração')

    const [dispositivo] = await eng.get<{ id: string }[]>(
      `dispositivo_tv?select=id&nome=eq.${encodeURIComponent(nome)}`,
    )
    await eng.rpc('revogar_dispositivo', { p_dispositivo: dispositivo?.id })
    expect((await page.request.get('/tv/dados')).status()).toBe(401)
    await page.reload()
    await expect(page.getByText('Dispositivo não autorizado')).toBeVisible()
  })

  test('token inválido não vira cookie', async ({ page }) => {
    await page.goto('/tv/entrar?t=nao-e-um-token')
    await expect(page).toHaveURL(/\/tv$/)
    await expect(page.getByText('Dispositivo não autorizado')).toBeVisible()
    expect((await page.context().cookies()).some((c) => c.name === 'almox_tv')).toBe(false)
  })
})
